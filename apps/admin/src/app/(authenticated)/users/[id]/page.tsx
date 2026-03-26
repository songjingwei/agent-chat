"use client";

import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  Spin,
  Button,
  Space,
  Table,
  Tooltip,
} from "antd";
import { ArrowLeftOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { usersApi } from "@/services/users";
import { personasApi, type Persona } from "@/services/personas";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title, Text } = Typography;

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const userId = params.id ?? "";

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.get(userId),
    enabled: Boolean(userId),
  });

  const { data: personasData, isLoading: personasLoading } = useQuery({
    queryKey: [...queryKeys.personas.all, { userId }],
    queryFn: () => personasApi.list({ userId, limit: 50 }),
    enabled: !!userId,
  });

  const personaColumns: ColumnsType<Persona> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string) => (
        <Tooltip title={id}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>
            {id.slice(0, 8)}...
          </span>
        </Tooltip>
      ),
    },
    { title: t("table.name"), dataIndex: "name", key: "name" },
    {
      title: t("table.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: t("table.version"),
      dataIndex: "version",
      key: "version",
      width: 80,
    },
    {
      title: t("table.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: t("table.actions"),
      key: "actions",
      width: 100,
      render: (_: unknown, record: Persona) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/personas/${record.id}`)}
        >
          {t("table.view")}
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Text type="danger">User not found</Text>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/users")}
        >
          {t("common.back")}
        </Button>
      </Space>

      <Title level={4}>{t("users.detail")}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">
            <span style={{ fontFamily: "monospace" }}>{user.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t("table.status")}>
            <StatusTag status={user.deletedAt ? "deleted" : "active"} />
          </Descriptions.Item>
          <Descriptions.Item label={t("table.email")}>{user.email}</Descriptions.Item>
          <Descriptions.Item label={t("table.displayName")}>
            {user.displayName}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.createdAt")}>
            {dayjs(user.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
          <Descriptions.Item label={t("table.updatedAt")}>
            {dayjs(user.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
          {user.deletedAt && (
            <Descriptions.Item label={t("table.deletedAt")} span={2}>
              {dayjs(user.deletedAt).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Title level={5}>{t("users.personas")}</Title>
      <Table<Persona>
        columns={personaColumns}
        dataSource={personasData?.items ?? []}
        loading={personasLoading}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </div>
  );
}
