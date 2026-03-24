import {
  createMemoryItem,
  findMemoryItemsByPersonaId,
  type DbClient,
  type MemoryItem,
} from "@agent/db";
import type {
  PromptMemoryItem,
  RuntimeMemoryWrite,
} from "@agent/runtime";

export interface ReadForTurnInput {
  personaId: string;
  limit?: number;
}

export interface PersistWritesInput {
  personaId: string;
  sessionId: string;
  writes: RuntimeMemoryWrite[];
  createdBy?: string;
}

export interface PersistWritesResult {
  inserted: number;
  skipped: number;
}

const DEFAULT_READ_LIMIT = 20;

const dedupeWrites = (writes: RuntimeMemoryWrite[]): RuntimeMemoryWrite[] => {
  const seen = new Set<string>();
  const result: RuntimeMemoryWrite[] = [];

  for (const item of writes) {
    const key = `${item.source}:${item.category}:${item.content.trim()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
};

const toPromptMemoryItem = (row: MemoryItem): PromptMemoryItem => {
  return {
    category: row.category as PromptMemoryItem["category"],
    content: row.content,
    weight: row.weight,
    source: row.source as PromptMemoryItem["source"],
  };
};

export class MemoryService {
  readonly #db: DbClient;

  constructor(db: DbClient) {
    this.#db = db;
  }

  async readForTurn(input: ReadForTurnInput): Promise<PromptMemoryItem[]> {
    const limit = Math.max(1, input.limit ?? DEFAULT_READ_LIMIT);
    const rows = await findMemoryItemsByPersonaId(this.#db, input.personaId);
    return rows.slice(0, limit).map(toPromptMemoryItem);
  }

  async persistWrites(input: PersistWritesInput): Promise<PersistWritesResult> {
    if (input.writes.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const deduped = dedupeWrites(input.writes);
    let inserted = 0;
    let skipped = 0;

    for (const write of deduped) {
      if (write.content.trim().length === 0) {
        skipped += 1;
        continue;
      }

      await createMemoryItem(this.#db, {
        personaId: input.personaId,
        sessionId: input.sessionId,
        category: write.category,
        content: write.content,
        weight: write.weight,
        source: write.source,
        createdBy: input.createdBy,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  }
}
