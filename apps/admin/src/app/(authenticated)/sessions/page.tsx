"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Select,
  Space,
  Tooltip,
  Button,
  Modal,
  message,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { sessionsApi, type Session } from "@/services/sessions";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.sessions.all, { cursor, status: statusFilter }],
    queryFn: () =>
      sessionsApi.list({ cursor, limit: 20, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.delete(sessionId),
    onSuccess: () => {
      messageApi.success(t("sessions.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleDelete = (session: Session) => {
    Modal.confirm({
      title: t("sessions.deleteConfirmTitle"),
      content: t("sessions.deleteConfirmContent"),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(session.id),
    });
  };

  const columns: ColumnsType<Session> = [
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
    {
      title: t("table.initiatorPersona"),
      key: "initiator",
      render: (_: unknown, record: Session) =>
        record.initiatorPersona?.name ?? record.initiatorPersonaId,
    },
    {
      title: t("table.targetPersona"),
      key: "target",
      render: (_: unknown, record: Session) =>
        record.targetPersona?.name ?? record.targetPersonaId,
    },
    {
      title: t("table.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: t("table.round"),
      key: "round",
      width: 100,
      render: (_: unknown, record: Session) =>
        `${record.currentRound} / ${record.maxRounds}`,
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
      width: 140,
      render: (_: unknown, record: Session) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/sessions/${record.id}`)}
          >
            {t("table.view")}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {t("table.delete")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div>
        <Title level={4}>{t("sessions.title")}</Title>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder={t("sessions.filterStatus")}
              allowClear
              style={{ width: 200 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCursor(undefined);
              }}
              options={[
                { label: t("status.active"), value: "active" },
                { label: t("status.completed"), value: "completed" },
                { label: t("status.paused"), value: "paused" },
                { label: t("status.failed"), value: "failed" },
              ]}
            />
          </Space>
        </div>
        <CursorPaginatedTable<Session>
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          nextCursor={data?.nextCursor}
          onCursorChange={setCursor}
          rowKey="id"
        />
      </div>
    </>
  );
}
