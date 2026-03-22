import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import type { InMemoryStore } from "./store.js";
import type {
  CreateSessionInput,
  ListSessionsInput,
  Session,
  SessionStatus,
} from "./types.js";

export class SessionService {
  constructor(private readonly store: InMemoryStore) {}

  create(input: CreateSessionInput): Session {
    if (!this.store.personas.has(input.initiatorPersonaId)) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${input.initiatorPersonaId}`);
    }

    if (!this.store.personas.has(input.targetPersonaId)) {
      throw new ApiError(404, "PERSONA_NOT_FOUND", `Persona not found: ${input.targetPersonaId}`);
    }

    const now = new Date().toISOString();
    const session: Session = {
      id: createId("ses"),
      initiatorPersonaId: input.initiatorPersonaId,
      targetPersonaId: input.targetPersonaId,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    this.store.sessions.set(session.id, session);
    this.store.messagesBySession.set(session.id, []);

    return session;
  }

  list(filters: ListSessionsInput = {}): Session[] {
    const sessions = Array.from(this.store.sessions.values());

    return sessions.filter(
      (session) => {
        if (
          filters.personaId &&
          session.initiatorPersonaId !== filters.personaId &&
          session.targetPersonaId !== filters.personaId
        ) {
          return false;
        }

        if (!filters.userId) {
          return true;
        }

        const initiatorPersona = this.store.personas.get(session.initiatorPersonaId);
        const targetPersona = this.store.personas.get(session.targetPersonaId);

        return (
          initiatorPersona?.userId === filters.userId ||
          targetPersona?.userId === filters.userId
        );
      },
    );
  }

  getById(sessionId: string): Session | undefined {
    return this.store.sessions.get(sessionId);
  }

  updateStatus(sessionId: string, status: SessionStatus): Session {
    const session = this.store.sessions.get(sessionId);
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    const updated: Session = {
      ...session,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.store.sessions.set(sessionId, updated);
    return updated;
  }
}
