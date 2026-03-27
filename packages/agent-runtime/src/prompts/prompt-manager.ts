import type { MemoryCategory, MemorySource } from "../schemas/structured-output.js";

export interface PromptPersonaSnapshot {
  id: string;
  name: string;
  bio?: string | undefined;
  traits: string[];
  systemPrompt?: string | undefined;
}

export interface PromptMessage {
  role: "agent" | "human" | "system";
  authorName: string;
  content: string;
}

export interface PromptMemoryItem {
  category: MemoryCategory;
  content: string;
  weight: number;
  source: MemorySource;
}

export interface BuildPromptInput {
  speakerPersona: PromptPersonaSnapshot;
  counterpartPersona: PromptPersonaSnapshot;
  recentMessages: PromptMessage[];
  memoryItems: PromptMemoryItem[];
  sessionGoal?: string | undefined;
}

export interface PromptBuildResult {
  prompt: string;
  meta: {
    tokenEstimate: number;
    includedMessages: number;
    includedMemories: number;
  };
}

export interface PromptManagerOptions {
  maxPromptTokens?: number;
  maxHistoryMessages?: number;
  maxMemoryItems?: number;
}

const DEFAULT_MAX_PROMPT_TOKENS = 2400;
const DEFAULT_MAX_HISTORY_MESSAGES = 16;
const DEFAULT_MAX_MEMORY_ITEMS = 8;

export const estimateTokenCount = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export class PromptManager {
  readonly #maxPromptTokens: number;
  readonly #maxHistoryMessages: number;
  readonly #maxMemoryItems: number;

  constructor(options: PromptManagerOptions = {}) {
    this.#maxPromptTokens = options.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
    this.#maxHistoryMessages =
      options.maxHistoryMessages ?? DEFAULT_MAX_HISTORY_MESSAGES;
    this.#maxMemoryItems = options.maxMemoryItems ?? DEFAULT_MAX_MEMORY_ITEMS;
  }

  buildTurnPrompt(input: BuildPromptInput): PromptBuildResult {
    const selectedMemories = this.selectMemories(input.memoryItems);
    const selectedMessages = this.selectMessagesWithinBudget(
      input.recentMessages,
      input.speakerPersona,
      input.counterpartPersona,
      selectedMemories,
      input.sessionGoal,
    );
    const prompt = this.renderPrompt(
      input.speakerPersona,
      input.counterpartPersona,
      selectedMessages,
      selectedMemories,
      input.sessionGoal,
    );

    return {
      prompt,
      meta: {
        tokenEstimate: estimateTokenCount(prompt),
        includedMessages: selectedMessages.length,
        includedMemories: selectedMemories.length,
      },
    };
  }

  private selectMemories(memoryItems: PromptMemoryItem[]): PromptMemoryItem[] {
    return [...memoryItems]
      .sort((left, right) => right.weight - left.weight)
      .slice(0, this.#maxMemoryItems);
  }

  private selectMessagesWithinBudget(
    messages: PromptMessage[],
    speakerPersona: PromptPersonaSnapshot,
    counterpartPersona: PromptPersonaSnapshot,
    memories: PromptMemoryItem[],
    sessionGoal?: string | undefined,
  ): PromptMessage[] {
    const selected = messages.slice(-this.#maxHistoryMessages);
    while (selected.length > 0) {
      const probePrompt = this.renderPrompt(
        speakerPersona,
        counterpartPersona,
        selected,
        memories,
        sessionGoal,
      );

      if (estimateTokenCount(probePrompt) <= this.#maxPromptTokens) {
        break;
      }
      selected.shift();
    }

    return selected;
  }

  private renderPrompt(
    speakerPersona: PromptPersonaSnapshot,
    counterpartPersona: PromptPersonaSnapshot,
    messages: PromptMessage[],
    memories: PromptMemoryItem[],
    sessionGoal?: string | undefined,
  ): string {
    const lines: string[] = [];
    lines.push("You are generating one turn for an agent-to-agent conversation.");
    lines.push("");
    lines.push("Speaker Persona:");
    lines.push(`- id: ${speakerPersona.id}`);
    lines.push(`- name: ${speakerPersona.name}`);
    lines.push(`- bio: ${speakerPersona.bio ?? "N/A"}`);
    lines.push(
      `- traits: ${speakerPersona.traits.length > 0 ? speakerPersona.traits.join(", ") : "N/A"}`,
    );
    lines.push(`- system prompt: ${speakerPersona.systemPrompt ?? "N/A"}`);
    lines.push("");
    lines.push("Counterpart Persona:");
    lines.push(`- id: ${counterpartPersona.id}`);
    lines.push(`- name: ${counterpartPersona.name}`);
    lines.push(`- bio: ${counterpartPersona.bio ?? "N/A"}`);
    lines.push(
      `- traits: ${counterpartPersona.traits.length > 0 ? counterpartPersona.traits.join(", ") : "N/A"}`,
    );
    lines.push("");
    lines.push(`Session goal: ${sessionGoal ?? "Build trust and explore compatibility."}`);
    lines.push("");
    lines.push("High-priority memories (sorted by weight):");
    if (memories.length === 0) {
      lines.push("- none");
    } else {
      for (const memory of memories) {
        lines.push(
          `- [${memory.weight.toFixed(2)}][${memory.source}/${memory.category}] ${memory.content}`,
        );
      }
    }
    lines.push("");
    lines.push("Recent conversation:");
    if (messages.length === 0) {
      lines.push("- no previous messages");
    } else {
      for (const message of messages) {
        lines.push(`- [${message.role}] ${message.authorName}: ${message.content}`);
      }
    }
    lines.push("");
    lines.push("Output requirements:");
    lines.push("- Return strictly one JSON object.");
    lines.push("- Do not use markdown fences.");
    lines.push("- Keep response.content concise and natural.");
    lines.push("- Do not include chain-of-thought or extra analysis fields.");
    lines.push("");
    lines.push("JSON shape:");
    lines.push("{");
    lines.push('  "response": {');
    lines.push('    "content": "string",');
    lines.push('    "shouldEndSession": false');
    lines.push("  }");
    lines.push("}");
    return lines.join("\n");
  }
}
