export type AgentState =
  | "idle"
  | "thinking"
  | "speaking"
  | "archiving"
  | "failed";

export type AgentEvent =
  | "START_TURN"
  | "RETRY_GENERATION"
  | "MODEL_OUTPUT_PARSED"
  | "MEMORY_PREPARED"
  | "TURN_COMPLETED"
  | "TURN_FAILED"
  | "RESET";

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  event: AgentEvent;
  at: string;
}

const STATE_TRANSITIONS: Record<
  AgentState,
  Partial<Record<AgentEvent, AgentState>>
> = {
  idle: {
    START_TURN: "thinking",
    RESET: "idle",
  },
  thinking: {
    RETRY_GENERATION: "thinking",
    MODEL_OUTPUT_PARSED: "speaking",
    TURN_FAILED: "failed",
    RESET: "idle",
  },
  speaking: {
    MEMORY_PREPARED: "archiving",
    TURN_FAILED: "failed",
    RESET: "idle",
  },
  archiving: {
    TURN_COMPLETED: "idle",
    TURN_FAILED: "failed",
    RESET: "idle",
  },
  failed: {
    START_TURN: "thinking",
    RESET: "idle",
  },
};

export class AgentStateMachine {
  #state: AgentState = "idle";
  #history: StateTransition[] = [];

  getState(): AgentState {
    return this.#state;
  }

  getHistory(): StateTransition[] {
    return [...this.#history];
  }

  transition(event: AgentEvent): AgentState {
    const nextState = STATE_TRANSITIONS[this.#state][event];
    if (!nextState) {
      throw new Error(`Invalid state transition: ${this.#state} -> ${event}`);
    }

    this.#history.push({
      from: this.#state,
      to: nextState,
      event,
      at: new Date().toISOString(),
    });
    this.#state = nextState;
    return this.#state;
  }
}
