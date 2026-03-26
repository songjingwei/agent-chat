import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@agent/db";
import { agentPersonas } from "@agent/db";
import type { RuntimeModelClient } from "@agent/runtime";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import { processSourceText, validateSourceText } from "../lib/text-processor.js";
import type { BuildPersonaInput, BuildPersonaResult, Persona } from "./types.js";

const BUILD_PERSONA_SYSTEM_PROMPT = `You are a persona builder for an AI social agent platform.
Given a user's source text (self-introduction, resume, chat logs, social media posts, etc.), extract key information to create a persona that represents the user's authentic self.

Return a single JSON object with these fields:
{
  "displayName": "A short display name (2-4 words, capturing their essence)",
  "bio": "A short bio (1-2 sentences)",
  "traits": ["3-5 personality traits, each 1-3 words"],
  "systemPrompt": "A detailed system prompt (see requirements below)"
}

systemPrompt requirements (this is the most important field — it defines the agent's soul):
- Length: 6-12 sentences, 150-400 words.
- Must cover ALL of the following aspects:
  1. Core identity: who this person is, what they care about most.
  2. Communication style: sentence length preference, formal vs casual, humor style, use of metaphors or slang.
  3. Conversation habits: do they ask questions often? do they share stories? do they give advice? do they use emojis?
  4. Emotional tone: default mood, how they respond to vulnerability, how they express empathy.
  5. Topics they naturally gravitate toward and topics they avoid.
  6. First-impression behavior: how they open a conversation with a stranger vs someone they know.
- Write in second person ("You are...", "You tend to...", "When someone shares...").
- Be specific and vivid — avoid generic phrases like "you are friendly and helpful".
- Ground the style in concrete examples from the source text when possible.

Other rules:
- Return strictly one JSON object. Do not use markdown fences.
- Keep the tone authentic and warm.
- Traits should be distinctive and specific, not generic.`;

interface PersonaBuilderServiceOptions {
  modelClient: RuntimeModelClient;
}

export class PersonaBuilderService {
  readonly #db: DbClient;
  readonly #modelClient: RuntimeModelClient;

  constructor(db: DbClient, options: PersonaBuilderServiceOptions) {
    this.#db = db;
    this.#modelClient = options.modelClient;
  }

  async buildPersona(input: BuildPersonaInput): Promise<BuildPersonaResult> {
    const validation = validateSourceText(input.sourceText);
    if (!validation.valid) {
      throw new ApiError(400, "INVALID_SOURCE_TEXT", validation.error!);
    }

    const processed = processSourceText(input.sourceText);

    let existingVersion = 0;
    if (input.existingPersonaId) {
      const existing = await this.#getOwnedPersona(
        input.existingPersonaId,
        input.userId,
      );
      if (!existing) {
        throw new ApiError(
          404,
          "PERSONA_NOT_FOUND",
          `Persona not found: ${input.existingPersonaId}`,
        );
      }
      existingVersion = existing.version;
    }

    const modelResponse = await this.#modelClient.generate({
      prompt: `${BUILD_PERSONA_SYSTEM_PROMPT}\n\nSource text:\n${processed.cleaned}`,
      maxOutputTokens: 1200,
    });

    if (modelResponse.finishReason === "error") {
      throw new ApiError(
        502,
        "PERSONA_BUILD_LLM_ERROR",
        "LLM failed to generate persona",
      );
    }

    const parsed = this.#parseLLMResponse(modelResponse.text);
    const now = new Date();
    const version = existingVersion + 1;

    if (input.existingPersonaId) {
      const updatedRows = await this.#db
        .update(agentPersonas)
        .set({
          name: parsed.displayName,
          bio: parsed.bio,
          traits: parsed.traits,
          systemPrompt: parsed.systemPrompt,
          version,
          updatedBy: input.userId,
          updatedAt: now,
        })
        .where(
          and(
            eq(agentPersonas.id, input.existingPersonaId),
            eq(agentPersonas.userId, input.userId),
          ),
        )
        .returning();

      if (updatedRows.length === 0) {
        throw new ApiError(
          404,
          "PERSONA_NOT_FOUND",
          `Persona not found: ${input.existingPersonaId}`,
        );
      }

      return {
        persona: mapPersona(updatedRows[0]!),
        generatedSystemPrompt: parsed.systemPrompt,
        version,
      };
    }

    const createdRows = await this.#db
      .insert(agentPersonas)
      .values({
        id: createId("prs"),
        userId: input.userId,
        name: parsed.displayName,
        bio: parsed.bio,
        traits: parsed.traits,
        systemPrompt: parsed.systemPrompt,
        version,
        status: "draft",
        createdBy: input.userId,
        updatedBy: input.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      persona: mapPersona(createdRows[0]!),
      generatedSystemPrompt: parsed.systemPrompt,
      version,
    };
  }

  async #getOwnedPersona(
    personaId: string,
    userId: string,
  ): Promise<{ version: number } | null> {
    const rows = await this.#db
      .select({ version: agentPersonas.version })
      .from(agentPersonas)
      .where(
        and(
          eq(agentPersonas.id, personaId),
          eq(agentPersonas.userId, userId),
          isNull(agentPersonas.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  #parseLLMResponse(response: string): {
    displayName: string;
    bio: string;
    traits: string[];
    systemPrompt: string;
  } {
    const jsonText = extractJsonObject(response);
    if (!jsonText) {
      throw new ApiError(
        502,
        "PERSONA_BUILD_PARSE_ERROR",
        "Failed to extract JSON from LLM response",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new ApiError(
        502,
        "PERSONA_BUILD_PARSE_ERROR",
        "Failed to parse LLM response as JSON",
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new ApiError(
        502,
        "PERSONA_BUILD_PARSE_ERROR",
        "LLM response is not a JSON object",
      );
    }

    const record = parsed as Record<string, unknown>;
    const displayName =
      typeof record.displayName === "string" && record.displayName.length > 0
        ? record.displayName.slice(0, 100)
        : "Unnamed Persona";
    const bio =
      typeof record.bio === "string" ? record.bio.slice(0, 1000) : "";
    const traits = Array.isArray(record.traits)
      ? record.traits
          .filter(
            (trait): trait is string =>
              typeof trait === "string" && trait.length > 0,
          )
          .slice(0, 20)
          .map((trait) => trait.slice(0, 80))
      : [];
    const systemPrompt =
      typeof record.systemPrompt === "string" ? record.systemPrompt : "";

    return { displayName, bio, traits, systemPrompt };
  }
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

function mapPersona(row: typeof agentPersonas.$inferSelect): Persona {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.name,
    bio: row.bio ?? undefined,
    traits: row.traits ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
