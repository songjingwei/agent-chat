"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  Spin,
  Button,
  Space,
  Tag,
  Timeline,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { sessionsApi } from "@/services/sessions";
import { messagesApi, type Message } from "@/services/messages";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title, Text, Paragraph } = Typography;

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const sessionId = params.id ?? "";
  const [msgCursor, setMsgCursor] = useState<string | undefined>(undefined);

  const { data: session, isLoading } = useQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: () => sessionsApi.get(sessionId),
    enabled: Boolean(sessionId),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: [...queryKeys.messages.bySession(sessionId), { cursor: msgCursor }],
    queryFn: () => messagesApi.list(sessionId, { cursor: msgCursor, limit: 50 }),
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Text type="danger">Session not found</Text>
      </div>
    );
  }

  const renderPersonaIdentity = (
    personaId: string,
    personaName?: string,
  ) => (
    <Space direction="vertical" size={0}>
      {personaName ? <Text>{personaName}</Text> : null}
      <Text style={{ fontFamily: "monospace" }}>{personaId}</Text>
    </Space>
  );

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/sessions")}
        >
          {t("common.back")}
        </Button>
      </Space>

      <Title level={4}>{t("sessions.detail")}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">
            <span style={{ fontFamily: "monospace" }}>{session.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t("table.status")}>
            <StatusTag status={session.status} />
          </Descriptions.Item>
          <Descriptions.Item label={t("table.initiatorPersona")}>
            {renderPersonaIdentity(
              session.initiatorPersonaId,
              session.initiatorPersona?.name,
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.targetPersona")}>
            {renderPersonaIdentity(
              session.targetPersonaId,
              session.targetPersona?.name,
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.currentRound")}>
            {session.currentRound}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.maxRounds")}>
            {session.maxRounds}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.createdAt")}>
            {dayjs(session.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.updatedAt")}>
            {dayjs(session.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Title level={5}>{t("sessions.messages")}</Title>

      {messagesLoading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Timeline
            items={(messagesData?.items ?? []).map((msg: Message) => ({
              key: msg.id,
              color:
                msg.role === "system"
                  ? "gray"
                  : msg.senderPersonaId === session.initiatorPersonaId
                    ? "blue"
                    : "green",
              children: (
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <Space>
                      <Text strong>
                        {msg.senderPersona?.name ?? msg.senderPersonaId}
                      </Text>
                      <Tag>{msg.role}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Round {msg.roundNumber}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(msg.createdAt).format("HH:mm:ss")}
                      </Text>
                    </Space>
                  </div>
                  <Paragraph
                    style={{
                      background: "#f6f8fa",
                      padding: "8px 12px",
                      borderRadius: 6,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </Paragraph>
                </div>
              ),
            }))}
          />
          {messagesData?.nextCursor && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button
                onClick={() => setMsgCursor(messagesData.nextCursor ?? undefined)}
              >
                {t("sessions.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
