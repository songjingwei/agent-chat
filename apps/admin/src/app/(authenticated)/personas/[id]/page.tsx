"use client";

import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  Spin,
  Button,
  Space,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { personasApi } from "@/services/personas";
import StatusTag from "@/components/StatusTag";
import JsonViewer from "@/components/JsonViewer";
import { useT } from "@/lib/i18n";

const { Title, Text } = Typography;

export default function PersonaDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const personaId = params.id ?? "";

  const { data: persona, isLoading } = useQuery({
    queryKey: queryKeys.personas.detail(personaId),
    queryFn: () => personasApi.get(personaId),
    enabled: Boolean(personaId),
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Text type="danger">Persona not found</Text>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/personas")}
        >
          {t("common.back")}
        </Button>
      </Space>

      <Title level={4}>{t("personas.detail")}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">
            <span style={{ fontFamily: "monospace" }}>{persona.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t("table.status")}>
            <StatusTag status={persona.status} />
          </Descriptions.Item>
          <Descriptions.Item label={t("table.name")}>{persona.name}</Descriptions.Item>
          <Descriptions.Item label={t("table.version")}>
            {persona.version}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.owner")} span={2}>
            {persona.user?.email ?? persona.userId}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.bio")} span={2}>
            {persona.bio ?? <Text type="secondary">No bio</Text>}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.createdAt")}>
            {dayjs(persona.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.updatedAt")}>
            {dayjs(persona.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {persona.systemPrompt && (
        <Card title={t("personas.systemPrompt")} style={{ marginBottom: 24 }}>
          <pre
            style={{
              background: "#f6f8fa",
              padding: 16,
              borderRadius: 6,
              overflow: "auto",
              maxHeight: 400,
              fontSize: 13,
              lineHeight: 1.5,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            <code>{persona.systemPrompt}</code>
          </pre>
        </Card>
      )}

      {persona.traits && (
        <JsonViewer data={persona.traits} title={t("personas.traits")} defaultOpen />
      )}
    </div>
  );
}
