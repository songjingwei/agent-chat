import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import {
  agentPersonas,
  assessmentAnswers,
  assessmentInterpretations,
  assessmentItems,
  assessmentSessionItems,
  assessmentSessions,
  assessmentTemplateSlots,
  assessmentTemplates,
  memoryItems,
} from "@agent/db";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type {
  AssessmentDimensionScore,
  AssessmentQuestion,
  AssessmentQuestionOption,
  AssessmentResultView,
  AssessmentSessionView,
} from "./types.js";

const DEFAULT_ASSESSMENT_TEMPLATE_SLUG = "mirror-core-v1";
const OPEN_ASSESSMENT_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "interpreting",
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  sociability: "共鸣之潮",
  introspection: "深潜之镜",
  adventurousness: "探索之翼",
  analytical: "解构之匙",
  aesthetic: "感知之弦",
  imaginative: "造梦之境",
  empathy: "共情之泉",
};

interface CreateAssessmentSessionInput {
  userId: string;
  personaId: string;
  templateSlug?: string | undefined;
}

interface SubmitAssessmentAnswerInput {
  userId: string;
  sessionId: string;
  sessionItemId: string;
  selectedOptionValue?: string | undefined;
  freeTextAnswer?: string | null | undefined;
}

type SessionRow = typeof assessmentSessions.$inferSelect;
type SessionItemRow = typeof assessmentSessionItems.$inferSelect;
type SessionAnswerRow = typeof assessmentAnswers.$inferSelect;
type SessionDetailItemRow = {
  id: string;
  sessionId: string;
  slotId: string;
  itemId: string;
  displayOrder: number;
  questionSnapshot: string;
  optionsSnapshot: AssessmentQuestionOption[] | null;
  answeredAt: Date | null;
  createdAt: Date;
  answerType: string;
};

export class AssessmentService {
  constructor(private readonly db: DbClient) {}

  async createSession(input: CreateAssessmentSessionInput): Promise<AssessmentSessionView> {
    await this.ensureOwnedPersona(input.userId, input.personaId);

    const template = await this.findActiveTemplate(
      input.templateSlug ?? DEFAULT_ASSESSMENT_TEMPLATE_SLUG,
    );

    const existing = await this.db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.userId, input.userId),
          eq(assessmentSessions.personaId, input.personaId),
          eq(assessmentSessions.templateId, template.id),
          inArray(assessmentSessions.status, [...OPEN_ASSESSMENT_STATUSES]),
        ),
      )
      .orderBy(desc(assessmentSessions.updatedAt))
      .limit(1);

    if (existing[0]) {
      return this.getSession(input.userId, existing[0].id);
    }

    const now = new Date();
    const seed = randomUUID().replaceAll("-", "");
    const sessionId = createId("asn");

    await this.db.transaction(async (tx) => {
      const slots = await tx
        .select()
        .from(assessmentTemplateSlots)
        .where(eq(assessmentTemplateSlots.templateId, template.id))
        .orderBy(asc(assessmentTemplateSlots.slotIndex));

      if (slots.length === 0) {
        throw new ApiError(
          400,
          "ASSESSMENT_TEMPLATE_EMPTY",
          `Assessment template has no slots: ${template.slug}`,
        );
      }

      const items = await tx
        .select()
        .from(assessmentItems)
        .where(
          and(
            eq(assessmentItems.status, "active"),
            eq(assessmentItems.framework, template.framework),
            eq(assessmentItems.language, template.language),
          ),
        );

      const selectedItems = selectItemsForSlots(items, slots, seed);

      await tx.insert(assessmentSessions).values({
        id: sessionId,
        userId: input.userId,
        personaId: input.personaId,
        templateId: template.id,
        status: "in_progress",
        currentIndex: 0,
        seed,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(assessmentSessionItems).values(
        selectedItems.map(({ item, slot }, index) => ({
          id: createId("asii"),
          sessionId,
          slotId: slot.id,
          itemId: item.id,
          displayOrder: index,
          questionSnapshot: item.questionText,
          optionsSnapshot: item.optionsJson ?? [],
          createdAt: now,
        })),
      );
    });

    return this.getSession(input.userId, sessionId);
  }

  async getSession(userId: string, sessionId: string): Promise<AssessmentSessionView> {
    const session = await this.findOwnedSession(userId, sessionId);
    const template = await this.findTemplateById(session.templateId);
    const { items, answers, interpretation } = await this.loadSessionDetail(session.id);

    return mapAssessmentSessionView({
      session,
      template,
      items,
      answers,
      interpretation,
    });
  }

  async submitAnswer(input: SubmitAssessmentAnswerInput): Promise<AssessmentSessionView> {
    const session = await this.findOwnedSession(input.userId, input.sessionId);

    if (session.status === "completed" || session.status === "failed") {
      throw new ApiError(
        409,
        "ASSESSMENT_SESSION_IMMUTABLE",
        `Assessment session is no longer writable: ${session.id}`,
      );
    }

    const [sessionItem] = await this.db
      .select()
      .from(assessmentSessionItems)
      .where(
        and(
          eq(assessmentSessionItems.id, input.sessionItemId),
          eq(assessmentSessionItems.sessionId, session.id),
        ),
      )
      .limit(1);

    if (!sessionItem) {
      throw new ApiError(
        404,
        "ASSESSMENT_SESSION_ITEM_NOT_FOUND",
        `Assessment session item not found: ${input.sessionItemId}`,
      );
    }

    const [item] = await this.db
      .select({
        id: assessmentItems.id,
        answerType: assessmentItems.answerType,
      })
      .from(assessmentItems)
      .where(eq(assessmentItems.id, sessionItem.itemId))
      .limit(1);

    if (!item) {
      throw new ApiError(
        404,
        "ASSESSMENT_ITEM_NOT_FOUND",
        `Assessment item not found: ${sessionItem.itemId}`,
      );
    }

    validateAnswerPayload(
      item.answerType,
      sessionItem.optionsSnapshot ?? [],
      input.selectedOptionValue,
      input.freeTextAnswer,
    );

    const now = new Date();
    const [existingAnswer] = await this.db
      .select()
      .from(assessmentAnswers)
      .where(eq(assessmentAnswers.sessionItemId, sessionItem.id))
      .limit(1);

    if (existingAnswer) {
      await this.db
        .update(assessmentAnswers)
        .set({
          selectedOptionValue: input.selectedOptionValue,
          freeTextAnswer: input.freeTextAnswer ?? null,
          updatedAt: now,
        })
        .where(eq(assessmentAnswers.id, existingAnswer.id));
    } else {
      await this.db.insert(assessmentAnswers).values({
        id: createId("asa"),
        sessionItemId: sessionItem.id,
        selectedOptionValue: input.selectedOptionValue,
        freeTextAnswer: input.freeTextAnswer ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.db
      .update(assessmentSessionItems)
      .set({ answeredAt: now })
      .where(eq(assessmentSessionItems.id, sessionItem.id));

    const sessionItems = await this.db
      .select()
      .from(assessmentSessionItems)
      .where(eq(assessmentSessionItems.sessionId, session.id))
      .orderBy(asc(assessmentSessionItems.displayOrder));

    const answers = await this.db
      .select()
      .from(assessmentAnswers)
      .where(
        inArray(
          assessmentAnswers.sessionItemId,
          sessionItems.map((value) => value.id),
        ),
      );

    const answeredCount = answers.length;
    const isCompleted = answeredCount === sessionItems.length;

    if (isCompleted) {
      await this.finalizeSession(session, sessionItems, answers);
    } else {
      await this.db
        .update(assessmentSessions)
        .set({
          status: "in_progress",
          currentIndex: answeredCount,
          updatedAt: now,
        })
        .where(eq(assessmentSessions.id, session.id));
    }

    return this.getSession(input.userId, session.id);
  }

  async getResult(userId: string, sessionId: string): Promise<AssessmentResultView> {
    const session = await this.findOwnedSession(userId, sessionId);
    const [interpretation] = await this.db
      .select()
      .from(assessmentInterpretations)
      .where(eq(assessmentInterpretations.sessionId, session.id))
      .limit(1);

    if (!interpretation) {
      return {
        sessionId,
        status:
          session.status === "failed"
            ? "failed"
            : session.status === "completed"
              ? "pending"
              : "pending",
        summary: null,
        confidence: null,
        dimensionScores: [],
        applied: false,
        appliedVersion: null,
      };
    }

    return {
      sessionId,
      status: interpretation.status as AssessmentResultView["status"],
      summary: interpretation.summary ?? null,
      confidence: interpretation.confidence ?? null,
      dimensionScores: parseDimensionScores(interpretation.dimensionScores),
      applied: interpretation.status === "applied",
      appliedVersion: interpretation.appliedPersonaVersion ?? null,
    };
  }

  private async finalizeSession(
    session: SessionRow,
    sessionItems: SessionItemRow[],
    answers: SessionAnswerRow[],
  ) {
    const now = new Date();
    const interpretationPayload = buildHeuristicInterpretation(sessionItems, answers);
    const serializedDimensionScores = serializeDimensionScores(
      interpretationPayload.dimensionScores,
    );
    const memoryWrites = interpretationPayload.dimensionScores.slice(0, 2).map((entry) => ({
      category: "preference" as const,
      content: `测评显示该 persona 更偏向 ${entry.label}（${Math.round(entry.normalizedScore * 100)}%）。`,
      weight: Math.max(0.6, Math.min(0.85, entry.normalizedScore)),
      source: "assessment_inferred" as const,
      metadata: {
        sessionId: session.id,
        dimension: entry.dimension,
        normalizedScore: entry.normalizedScore,
        evidenceSessionItemIds: entry.evidenceSessionItemIds,
      },
    }));

    await this.db.transaction(async (tx) => {
      await tx
        .insert(assessmentInterpretations)
        .values({
          id: createId("air"),
          sessionId: session.id,
          status: "completed",
          modelProvider: "system",
          modelName: "assessment-heuristic-v1",
          promptVersion: "heuristic-v1",
          summary: interpretationPayload.summary,
          confidence: interpretationPayload.confidence,
          dimensionScores: serializedDimensionScores,
          memoryWrites,
          rawOutput: interpretationPayload,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: assessmentInterpretations.sessionId,
          set: {
            status: "completed",
            modelProvider: "system",
            modelName: "assessment-heuristic-v1",
            promptVersion: "heuristic-v1",
            summary: interpretationPayload.summary,
            confidence: interpretationPayload.confidence,
            dimensionScores: serializedDimensionScores,
            memoryWrites,
            rawOutput: interpretationPayload,
            updatedAt: now,
          },
        });

      if (memoryWrites.length > 0) {
        await tx.insert(memoryItems).values(
          memoryWrites.map((entry) => ({
            id: createId("mem"),
            personaId: session.personaId,
            category: entry.category,
            content: entry.content,
            weight: entry.weight,
            source: entry.source,
            metadata: entry.metadata,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }

      await tx
        .update(assessmentSessions)
        .set({
          status: "completed",
          currentIndex: sessionItems.length,
          submittedAt: now,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(assessmentSessions.id, session.id));
    });
  }

  private async ensureOwnedPersona(userId: string, personaId: string) {
    const [persona] = await this.db
      .select({
        id: agentPersonas.id,
      })
      .from(agentPersonas)
      .where(
        and(
          eq(agentPersonas.id, personaId),
          eq(agentPersonas.userId, userId),
          isNull(agentPersonas.deletedAt),
        ),
      )
      .limit(1);

    if (!persona) {
      throw new ApiError(
        404,
        "PERSONA_NOT_FOUND",
        `Persona not found for current user: ${personaId}`,
      );
    }

    return persona;
  }

  private async findOwnedSession(userId: string, sessionId: string) {
    const [session] = await this.db
      .select()
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentSessions.userId, userId),
        ),
      )
      .limit(1);

    if (!session) {
      throw new ApiError(
        404,
        "ASSESSMENT_SESSION_NOT_FOUND",
        `Assessment session not found: ${sessionId}`,
      );
    }

    return session;
  }

  private async findActiveTemplate(slug: string) {
    const [template] = await this.db
      .select()
      .from(assessmentTemplates)
      .where(
        and(
          eq(assessmentTemplates.slug, slug),
          eq(assessmentTemplates.status, "active"),
        ),
      )
      .limit(1);

    if (!template) {
      throw new ApiError(
        404,
        "ASSESSMENT_TEMPLATE_NOT_FOUND",
        `Assessment template not found: ${slug}`,
      );
    }

    return template;
  }

  private async findTemplateById(templateId: string) {
    const [template] = await this.db
      .select()
      .from(assessmentTemplates)
      .where(eq(assessmentTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new ApiError(
        404,
        "ASSESSMENT_TEMPLATE_NOT_FOUND",
        `Assessment template not found: ${templateId}`,
      );
    }

    return template;
  }

  private async loadSessionDetail(sessionId: string) {
    const items = await this.db
      .select({
        id: assessmentSessionItems.id,
        sessionId: assessmentSessionItems.sessionId,
        slotId: assessmentSessionItems.slotId,
        itemId: assessmentSessionItems.itemId,
        displayOrder: assessmentSessionItems.displayOrder,
        questionSnapshot: assessmentSessionItems.questionSnapshot,
        optionsSnapshot: assessmentSessionItems.optionsSnapshot,
        answeredAt: assessmentSessionItems.answeredAt,
        createdAt: assessmentSessionItems.createdAt,
        answerType: assessmentItems.answerType,
      })
      .from(assessmentSessionItems)
      .innerJoin(assessmentItems, eq(assessmentItems.id, assessmentSessionItems.itemId))
      .where(eq(assessmentSessionItems.sessionId, sessionId))
      .orderBy(asc(assessmentSessionItems.displayOrder));

    const answers =
      items.length === 0
        ? []
        : await this.db
          .select()
          .from(assessmentAnswers)
          .where(
            inArray(
              assessmentAnswers.sessionItemId,
              items.map((value) => value.id),
            ),
          );

    const [interpretation] = await this.db
      .select()
      .from(assessmentInterpretations)
      .where(eq(assessmentInterpretations.sessionId, sessionId))
      .limit(1);

    return { items, answers, interpretation: interpretation ?? null };
  }
}

function selectItemsForSlots(
  items: (typeof assessmentItems.$inferSelect)[],
  slots: (typeof assessmentTemplateSlots.$inferSelect)[],
  seed: string,
) {
  const usedIds = new Set<string>();

  return slots.map((slot) => {
    const pool = items.filter((item) => {
      if (usedIds.has(item.id)) return false;
      if (item.dimension !== slot.dimension) return false;
      if (item.answerType !== slot.answerType) return false;
      if (slot.difficulty && item.difficulty !== slot.difficulty) return false;

      const itemTags = item.tags ?? [];
      const requiredTags = slot.requiredTags ?? [];
      const excludedTags = slot.excludedTags ?? [];

      if (!requiredTags.every((tag) => itemTags.includes(tag))) return false;
      if (excludedTags.some((tag) => itemTags.includes(tag))) return false;

      return true;
    });

    if (pool.length === 0) {
      throw new ApiError(
        500,
        "ASSESSMENT_ITEM_POOL_EMPTY",
        `No active assessment item matches slot ${slot.id} (${slot.dimension}).`,
      );
    }

    const limitedPool =
      slot.randomPoolLimit && slot.randomPoolLimit > 0
        ? pool.slice(0, slot.randomPoolLimit)
        : pool;
    const index = stableIndex(seed, slot.slotIndex, limitedPool.length);
    const item = limitedPool[index]!;
    usedIds.add(item.id);
    return { slot, item };
  });
}

function stableIndex(seed: string, slotIndex: number, size: number) {
  let hash = 0;
  const text = `${seed}:${slotIndex}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

function validateAnswerPayload(
  answerType: string,
  options: AssessmentQuestionOption[],
  selectedOptionValue?: string,
  freeTextAnswer?: string | null,
) {
  if (answerType === "free_text") {
    if (!freeTextAnswer || freeTextAnswer.trim().length === 0) {
      throw new ApiError(
        400,
        "ASSESSMENT_FREE_TEXT_REQUIRED",
        "Free text answer is required for this assessment item.",
      );
    }
    return;
  }

  if (!selectedOptionValue) {
    throw new ApiError(
      400,
      "ASSESSMENT_OPTION_REQUIRED",
      "selectedOptionValue is required for this assessment item.",
    );
  }

  const exists = options.some((option) => option.value === selectedOptionValue);
  if (!exists) {
    throw new ApiError(
      400,
      "ASSESSMENT_OPTION_INVALID",
      `Unknown assessment option value: ${selectedOptionValue}`,
    );
  }
}

function buildHeuristicInterpretation(
  sessionItems: SessionItemRow[],
  answers: SessionAnswerRow[],
) {
  const answerMap = new Map(answers.map((answer) => [answer.sessionItemId, answer]));
  const scoreMap = new Map<
    string,
    { score: number; evidenceSessionItemIds: string[] }
  >();

  for (const sessionItem of sessionItems) {
    const answer = answerMap.get(sessionItem.id);
    if (!answer?.selectedOptionValue) continue;

    const selectedOption = (sessionItem.optionsSnapshot ?? []).find(
      (option) => option.value === answer.selectedOptionValue,
    );
    if (!selectedOption?.dimension) continue;

    const score = selectedOption.score ?? 0;
    const existing = scoreMap.get(selectedOption.dimension) ?? {
      score: 0,
      evidenceSessionItemIds: [],
    };
    existing.score += score;
    existing.evidenceSessionItemIds.push(sessionItem.id);
    scoreMap.set(selectedOption.dimension, existing);
  }

  const dimensionScores: AssessmentDimensionScore[] = Array.from(scoreMap.entries())
    .map(([dimension, value]) => ({
      dimension,
      label: DIMENSION_LABELS[dimension] ?? dimension,
      score: value.score,
      normalizedScore: Math.min(value.score / 15, 1),
      evidenceSessionItemIds: value.evidenceSessionItemIds,
    }))
    .sort((left, right) => right.score - left.score);

  const topLabels = dimensionScores.slice(0, 2).map((entry) => entry.label);
  const summary =
    topLabels.length === 0
      ? "本次测评已完成，但当前题目缺少可用于聚合的结构化分数。"
      : topLabels.length === 1
        ? `本次测评显示你更偏向 ${topLabels[0]}，镜像会优先吸收这部分表达倾向。`
        : `本次测评显示你更偏向 ${topLabels[0]} 与 ${topLabels[1]}，镜像会优先吸收这两种表达倾向。`;

  const confidence =
    dimensionScores.length === 0
      ? 0.3
      : Math.min(
        0.9,
        0.45 +
          dimensionScores
            .slice(0, 2)
            .reduce((total, entry) => total + entry.normalizedScore, 0) /
            2,
      );

  return {
    summary,
    confidence,
    dimensionScores,
  };
}

function mapAssessmentSessionView(input: {
  session: SessionRow;
  template: typeof assessmentTemplates.$inferSelect;
  items: SessionDetailItemRow[];
  answers: SessionAnswerRow[];
  interpretation: typeof assessmentInterpretations.$inferSelect | null;
}): AssessmentSessionView {
  const answerMap = new Map(input.answers.map((answer) => [answer.sessionItemId, answer]));
  const answeredCount = input.answers.length;
  const nextItem = input.items.find((item) => !answerMap.has(item.id)) ?? null;

  return {
    id: input.session.id,
    personaId: input.session.personaId,
    templateId: input.template.id,
    templateSlug: input.template.slug,
    templateName: input.template.name,
    status: input.session.status as AssessmentSessionView["status"],
    currentIndex: answeredCount,
    totalItems: input.items.length,
    answeredCount,
    currentItem: nextItem
      ? toAssessmentQuestion(nextItem, answerMap.get(nextItem.id) ?? null)
      : null,
    resultReady:
      input.interpretation?.status === "completed" ||
      input.interpretation?.status === "applied",
    startedAt: input.session.startedAt?.toISOString() ?? null,
    submittedAt: input.session.submittedAt?.toISOString() ?? null,
    completedAt: input.session.completedAt?.toISOString() ?? null,
  };
}

function toAssessmentQuestion(
  row: SessionDetailItemRow,
  answer: SessionAnswerRow | null,
): AssessmentQuestion {
  return {
    sessionItemId: row.id,
    itemId: row.itemId,
    questionText: row.questionSnapshot,
    answerType: row.answerType as AssessmentQuestion["answerType"],
    options: row.optionsSnapshot ?? [],
    answer: answer
      ? {
        selectedOptionValue: answer.selectedOptionValue ?? undefined,
        freeTextAnswer: answer.freeTextAnswer ?? null,
      }
      : null,
  };
}

function parseDimensionScores(value: unknown): AssessmentDimensionScore[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).dimension !== "string" ||
      typeof (entry as Record<string, unknown>).label !== "string" ||
      typeof (entry as Record<string, unknown>).score !== "number" ||
      typeof (entry as Record<string, unknown>).normalizedScore !== "number" ||
      !Array.isArray((entry as Record<string, unknown>).evidenceSessionItemIds)
    ) {
      return [];
    }

    return [
      {
        dimension: (entry as Record<string, unknown>).dimension as string,
        label: (entry as Record<string, unknown>).label as string,
        score: (entry as Record<string, unknown>).score as number,
        normalizedScore: (entry as Record<string, unknown>)
          .normalizedScore as number,
        evidenceSessionItemIds: (
          (entry as Record<string, unknown>).evidenceSessionItemIds as unknown[]
        ).filter((item): item is string => typeof item === "string"),
      },
    ];
  });
}

function serializeDimensionScores(
  scores: AssessmentDimensionScore[],
): Record<string, unknown>[] {
  return scores.map((entry) => ({
    dimension: entry.dimension,
    label: entry.label,
    score: entry.score,
    normalizedScore: entry.normalizedScore,
    evidenceSessionItemIds: entry.evidenceSessionItemIds,
  }));
}
