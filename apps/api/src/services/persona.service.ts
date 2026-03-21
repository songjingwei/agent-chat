import { createId } from "../lib/id";
import type { InMemoryStore } from "./store";
import type { CreatePersonaInput, Persona } from "./types";

export class PersonaService {
  constructor(private readonly store: InMemoryStore) {}

  create(input: CreatePersonaInput): Persona {
    const now = new Date().toISOString();
    const persona: Persona = {
      id: createId("prs"),
      userId: input.userId,
      displayName: input.displayName,
      bio: input.bio,
      traits: input.traits,
      createdAt: now,
      updatedAt: now,
    };

    this.store.personas.set(persona.id, persona);
    return persona;
  }

  getById(personaId: string): Persona | undefined {
    return this.store.personas.get(personaId);
  }

  list(userId?: string): Persona[] {
    const personas = Array.from(this.store.personas.values());

    if (!userId) {
      return personas;
    }

    return personas.filter((persona) => persona.userId === userId);
  }

  exists(personaId: string): boolean {
    return this.store.personas.has(personaId);
  }
}
