"use client";

import { useState } from "react";
import {
  Typography,
  Select,
  Space,
  Tooltip,
  Button,
  Modal,
  InputNumber,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { showBatchResult } from "@/lib/batch-feedback";
import { memoryApi, type MemoryItem } from "@/services/memory";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function MemoryPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
    undefined,
  );
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(
    undefined,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(1);
  const [editCategory, setEditCategory] = useState<string>("");
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [batchCategory, setBatchCategory] = useState<
    "fact" | "preference" | "experience" | "instruction"
  >("fact");
  const [batchWeight, setBatchWeight] = useState<number>(0.5);

  const { data, isLoading } = useQuery({
    queryKey: [
      ...queryKeys.memory.all,
      { cursor, category: categoryFilter, source: sourceFilter },
    ],
    queryFn: () =>
      memoryApi.list({
        cursor,
        limit: 20,
        category: categoryFilter,
        source: sourceFilter,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (memoryId: string) => memoryApi.delete(memoryId),
    onSuccess: () => {
      messageApi.success(t("memory.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<MemoryItem>;
    }) => memoryApi.update(id, body),
    onSuccess: () => {
      messageApi.success(t("memory.updateSuccess"));
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const batchMutation = useMutation({
    mutationFn: (
      body:
        | { action: "delete"; memoryIds: string[] }
        | {
            action: "update";
            memoryIds: string[];
            category?: "fact" | "preference" | "experience" | "instruction";
            weight?: number;
          },
    ) => memoryApi.batch(body),
    onSuccess: (result) => {
      showBatchResult(messageApi, t, result);
      setSelectedMemoryIds((prev) =>
        prev.filter((id) => !result.succeededIds.includes(id)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleDelete = (item: MemoryItem) => {
    Modal.confirm({
      title: t("memory.deleteConfirmTitle"),
      content: t("memory.deleteConfirmContent"),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(item.id),
    });
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditWeight(item.weight);
    setEditCategory(item.category);
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      body: { weight: editWeight, category: editCategory },
    });
  };

  const runBatchDelete = () => {
    if (selectedMemoryIds.length === 0) return;
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: t("batch.deleteSelected"),
        count: String(selectedMemoryIds.length),
      }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () =>
        batchMutation.mutateAsync({
          action: "delete",
          memoryIds: selectedMemoryIds,
        }),
    });
  };

  const runBatchUpdate = () => {
    if (selectedMemoryIds.length === 0) return;
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: t("batch.updateSelected"),
        count: String(selectedMemoryIds.length),
      }),
      okText: t("common.confirm"),
      onOk: () =>
        batchMutation.mutateAsync({
          action: "update",
          memoryIds: selectedMemoryIds,
          category: batchCategory,
          weight: batchWeight,
        }),
    });
  };

  const columns: ColumnsType<MemoryItem> = [
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
      title: t("table.personaId"),
      dataIndex: "personaId",
      key: "personaId",
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
      title: t("table.category"),
      dataIndex: "category",
      key: "category",
      width: 140,
      render: (category: string, record: MemoryItem) => {
        if (editingId === record.id) {
          return (
            <Select
              size="small"
              value={editCategory}
              onChange={setEditCategory}
              style={{ width: 120 }}
              options={[
                { label: "preference", value: "preference" },
                { label: "experience", value: "experience" },
                { label: "fact", value: "fact" },
                { label: "instruction", value: "instruction" },
              ]}
            />
          );
        }
        return category;
      },
    },
    {
      title: t("table.source"),
      dataIndex: "source",
      key: "source",
      width: 120,
    },
    {
      title: t("table.weight"),
      dataIndex: "weight",
      key: "weight",
      width: 100,
      render: (weight: number, record: MemoryItem) => {
        if (editingId === record.id) {
          return (
            <InputNumber
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={editWeight}
              onChange={(v) => setEditWeight(v ?? 1)}
              style={{ width: 80 }}
            />
          );
        }
        return weight;
      },
    },
    {
      title: t("table.content"),
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    {
      title: t("table.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: t("table.actions"),
      key: "actions",
      width: 160,
      render: (_: unknown, record: MemoryItem) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button
                type="link"
                size="small"
                onClick={() => handleSaveEdit(record.id)}
                loading={updateMutation.isPending}
              >
                {t("common.save")}
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => setEditingId(null)}
              >
                {t("common.cancel")}
              </Button>
            </Space>
          );
        }
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleStartEdit(record)}
            >
              {t("table.edit")}
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
        );
      },
    },
  ];

  return (
    <>
      {contextHolder}
      <div>
        <Title level={4}>{t("memory.title")}</Title>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder={t("memory.filterCategory")}
              allowClear
              style={{ width: 180 }}
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setCursor(undefined);
              }}
              options={[
                { label: "Preference", value: "preference" },
                { label: "Experience", value: "experience" },
                { label: "Fact", value: "fact" },
                { label: "Instruction", value: "instruction" },
              ]}
            />
            <Select
              placeholder={t("memory.filterSource")}
              allowClear
              style={{ width: 180 }}
              value={sourceFilter}
              onChange={(val) => {
                setSourceFilter(val);
                setCursor(undefined);
              }}
              options={[
                { label: "Agent Inferred", value: "agent_inferred" },
                { label: "Human Override", value: "human_override" },
                { label: "System", value: "system" },
              ]}
            />
          </Space>
        </div>
        <CursorPaginatedTable<MemoryItem>
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          nextCursor={data?.nextCursor}
          onCursorChange={setCursor}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedMemoryIds,
            onChange: (keys) =>
              setSelectedMemoryIds(keys.map((key) => String(key))),
          }}
          toolbar={(
            <Space wrap>
              <Typography.Text>
                {t("batch.selectedCount", { count: String(selectedMemoryIds.length) })}
              </Typography.Text>
              <Button
                danger
                onClick={runBatchDelete}
                disabled={selectedMemoryIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.deleteSelected")}
              </Button>
              <Select
                value={batchCategory}
                onChange={(
                  val: "fact" | "preference" | "experience" | "instruction",
                ) => setBatchCategory(val)}
                style={{ width: 170 }}
                options={[
                  { label: "Fact", value: "fact" },
                  { label: "Preference", value: "preference" },
                  { label: "Experience", value: "experience" },
                  { label: "Instruction", value: "instruction" },
                ]}
              />
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={batchWeight}
                onChange={(v) => setBatchWeight(v ?? 0.5)}
              />
              <Button
                onClick={runBatchUpdate}
                disabled={selectedMemoryIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.updateSelected")}
              </Button>
            </Space>
          )}
        />
      </div>
    </>
  );
}
