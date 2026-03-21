import type { ChatMessage, Persona, Session } from "./types";

export interface InMemoryStore {
  personas: Map<string, Persona>;
  sessions: Map<string, Session>;
  messagesBySession: Map<string, ChatMessage[]>;
}

export const createInMemoryStore = (): InMemoryStore => {
  return {
    personas: new Map(),
    sessions: new Map(),
    messagesBySession: new Map(),
  };
};
