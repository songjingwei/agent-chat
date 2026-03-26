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
  UndoOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { personasApi, type Persona } from "@/services/personas";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function PersonasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.personas.all, { cursor, status: statusFilter }],
    queryFn: () =>
      personasApi.list({ cursor, limit: 20, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (personaId: string) => personasApi.delete(personaId),
    onSuccess: () => {
      messageApi.success(t("personas.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (personaId: string) => personasApi.restore(personaId),
    onSuccess: () => {
      messageApi.success(t("personas.restoreSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleDelete = (persona: Persona) => {
    Modal.confirm({
      title: t("personas.deleteConfirmTitle"),
      content: t("personas.deleteConfirmContent", { name: persona.name }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(persona.id),
    });
  };

  const columns: ColumnsType<Persona> = [
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
      title: t("table.owner"),
      key: "owner",
      render: (_: unknown, record: Persona) =>
        record.user?.email ?? record.userId,
    },
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
      width: 160,
      render: (_: unknown, record: Persona) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/personas/${record.id}`)}
          >
            {t("table.view")}
          </Button>
          {record.deletedAt ? (
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => restoreMutation.mutate(record.id)}
            >
              {t("table.restore")}
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              {t("table.delete")}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div>
        <Title level={4}>{t("personas.title")}</Title>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder={t("personas.filterStatus")}
              allowClear
              style={{ width: 200 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCursor(undefined);
              }}
              options={[
                { label: t("status.active"), value: "active" },
                { label: t("status.draft"), value: "draft" },
                { label: t("status.building"), value: "building" },
                { label: t("status.archived"), value: "archived" },
              ]}
            />
          </Space>
        </div>
        <CursorPaginatedTable<Persona>
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
