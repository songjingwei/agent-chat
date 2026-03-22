import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type { InMemoryStore } from "./store.js";
import { SessionService } from "./session.service.js";
import type { ChatMessage, CreateHumanMessageInput } from "./types.js";

export class MessageService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly sessionService: SessionService,
  ) {}

  createHumanMessage(input: CreateHumanMessageInput): ChatMessage {
    const session = this.sessionService.getById(input.sessionId);
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${input.sessionId}`);
    }

    const isParticipant =
      session.initiatorPersonaId === input.authorPersonaId ||
      session.targetPersonaId === input.authorPersonaId;

    if (!isParticipant) {
      throw new ApiError(
        400,
        "INVALID_AUTHOR",
        "authorPersonaId must belong to session participants.",
      );
    }

    const message: ChatMessage = {
      id: createId("msg"),
      sessionId: input.sessionId,
      authorPersonaId: input.authorPersonaId,
      role: "human",
      content: input.content,
      createdAt: new Date().toISOString(),
    };

    const messages = this.store.messagesBySession.get(input.sessionId) ?? [];
    messages.push(message);
    this.store.messagesBySession.set(input.sessionId, messages);
    this.sessionService.updateStatus(input.sessionId, "active");

    return message;
  }

  listBySession(sessionId: string): ChatMessage[] {
    return this.store.messagesBySession.get(sessionId) ?? [];
  }
}
