import type { InMemoryStore } from "./store";
import type { LatestReport, Session } from "./types";

export class ReportService {
  constructor(private readonly store: InMemoryStore) {}

  getLatestByPersona(personaId: string): LatestReport | null {
    const sessions = this.findSessionsByPersona(personaId);
    if (sessions.length === 0) {
      return null;
    }

    const latestSession = sessions
      .sort((a, b) => {
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .at(0);

    if (!latestSession) {
      return null;
    }

    const messages = this.store.messagesBySession.get(latestSession.id) ?? [];
    const latestMessage = messages.at(-1);

    return {
      personaId,
      sessionId: latestSession.id,
      generatedAt: new Date().toISOString(),
      sessionStatus: latestSession.status,
      totalMessages: messages.length,
      latestMessagePreview: latestMessage ? latestMessage.content.slice(0, 80) : null,
      recommendation:
        messages.length > 0
          ? "可以继续观察互动质量并安排下一轮对话。"
          : "建议先发送一条人工介入消息，补充高权重偏好信息。",
      rationale:
        messages.length > 0
          ? "该会话已有人工输入样本，可据此继续评估沟通节奏。"
          : "当前会话还没有人工输入，画像可控性信号不足。",
    };
  }

  private findSessionsByPersona(personaId: string): Session[] {
    const sessions = Array.from(this.store.sessions.values());

    return sessions.filter(
      (session) =>
        session.initiatorPersonaId === personaId || session.targetPersonaId === personaId,
    );
  }
}
