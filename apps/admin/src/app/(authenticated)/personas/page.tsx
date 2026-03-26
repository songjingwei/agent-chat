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
import { showBatchResult } from "@/lib/batch-feedback";
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
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [batchStatus, setBatchStatus] = useState<"draft" | "active" | "archived">(
    "active",
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

  const batchMutation = useMutation({
    mutationFn: (
      body:
        | { action: "delete" | "restore"; personaIds: string[] }
        | {
            action: "update_status";
            personaIds: string[];
            status: "draft" | "active" | "archived";
          },
    ) => personasApi.batch(body),
    onSuccess: (result) => {
      showBatchResult(messageApi, t, result);
      setSelectedPersonaIds((prev) =>
        prev.filter((id) => !result.succeededIds.includes(id)),
      );
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

  const runBatchDeleteOrRestore = (action: "delete" | "restore") => {
    if (selectedPersonaIds.length === 0) return;
    const actionLabel =
      action === "delete" ? t("batch.deleteSelected") : t("batch.restoreSelected");
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: actionLabel,
        count: String(selectedPersonaIds.length),
      }),
      okText: action === "delete" ? t("common.delete") : t("table.restore"),
      okButtonProps: action === "delete" ? { danger: true } : undefined,
      onOk: () =>
        batchMutation.mutateAsync({ action, personaIds: selectedPersonaIds }),
    });
  };

  const runBatchStatusUpdate = () => {
    if (selectedPersonaIds.length === 0) return;
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: t("batch.updateStatus"),
        count: String(selectedPersonaIds.length),
      }),
      okText: t("common.confirm"),
      onOk: () =>
        batchMutation.mutateAsync({
          action: "update_status",
          personaIds: selectedPersonaIds,
          status: batchStatus,
        }),
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
          rowSelection={{
            selectedRowKeys: selectedPersonaIds,
            onChange: (keys) =>
              setSelectedPersonaIds(keys.map((key) => String(key))),
          }}
          toolbar={(
            <Space wrap>
              <Typography.Text>
                {t("batch.selectedCount", { count: String(selectedPersonaIds.length) })}
              </Typography.Text>
              <Button
                danger
                onClick={() => runBatchDeleteOrRestore("delete")}
                disabled={selectedPersonaIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.deleteSelected")}
              </Button>
              <Button
                onClick={() => runBatchDeleteOrRestore("restore")}
                disabled={selectedPersonaIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.restoreSelected")}
              </Button>
              <Select
                value={batchStatus}
                onChange={(val: "draft" | "active" | "archived") =>
                  setBatchStatus(val)
                }
                style={{ width: 160 }}
                options={[
                  { label: t("status.draft"), value: "draft" },
                  { label: t("status.active"), value: "active" },
                  { label: t("status.archived"), value: "archived" },
                ]}
              />
              <Button
                onClick={runBatchStatusUpdate}
                disabled={selectedPersonaIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.updateStatus")}
              </Button>
            </Space>
          )}
        />
      </div>
    </>
  );
}
