"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Input, Modal, Tooltip, Space, Button, message } from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { showBatchResult } from "@/lib/batch-feedback";
import { usersApi, type User } from "@/services/users";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Debounce search
  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDebouncedSearch(value);
        setCursor(undefined);
      }, 400);
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.users.all, { cursor, search: debouncedSearch }],
    queryFn: () =>
      usersApi.list({ cursor, limit: 20, search: debouncedSearch || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      messageApi.success(t("users.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (userId: string) => usersApi.restore(userId),
    onSuccess: () => {
      messageApi.success(t("users.restoreSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const batchMutation = useMutation({
    mutationFn: (body: { action: "delete" | "restore"; userIds: string[] }) =>
      usersApi.batch(body),
    onSuccess: (result) => {
      showBatchResult(messageApi, t, result);
      setSelectedUserIds((prev) =>
        prev.filter((id) => !result.succeededIds.includes(id)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleDelete = (user: User) => {
    Modal.confirm({
      title: t("users.deleteConfirmTitle"),
      content: t("users.deleteConfirmContent", { name: user.displayName || user.email }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(user.id),
    });
  };

  const runBatchAction = (action: "delete" | "restore") => {
    if (selectedUserIds.length === 0) return;
    const actionLabel =
      action === "delete" ? t("batch.deleteSelected") : t("batch.restoreSelected");
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: actionLabel,
        count: String(selectedUserIds.length),
      }),
      okText: action === "delete" ? t("common.delete") : t("table.restore"),
      okButtonProps: action === "delete" ? { danger: true } : undefined,
      onOk: () => batchMutation.mutateAsync({ action, userIds: selectedUserIds }),
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: t("table.id"),
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
    { title: t("table.email"), dataIndex: "email", key: "email" },
    { title: t("table.displayName"), dataIndex: "displayName", key: "displayName" },
    {
      title: t("table.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: t("table.status"),
      key: "status",
      width: 100,
      render: (_: unknown, record: User) => (
        <StatusTag status={record.deletedAt ? "deleted" : "active"} />
      ),
    },
    {
      title: t("table.actions"),
      key: "actions",
      width: 160,
      render: (_: unknown, record: User) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/users/${record.id}`)}
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
        <Title level={4}>{t("users.title")}</Title>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder={t("users.searchPlaceholder")}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              debounceTimer(e.target.value);
            }}
            style={{ width: 360 }}
            allowClear
          />
        </div>
        <CursorPaginatedTable<User>
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          nextCursor={data?.nextCursor}
          onCursorChange={setCursor}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedUserIds,
            onChange: (keys) => setSelectedUserIds(keys.map((key) => String(key))),
          }}
          toolbar={(
            <Space wrap>
              <Typography.Text>
                {t("batch.selectedCount", { count: String(selectedUserIds.length) })}
              </Typography.Text>
              <Button
                danger
                onClick={() => runBatchAction("delete")}
                disabled={selectedUserIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.deleteSelected")}
              </Button>
              <Button
                onClick={() => runBatchAction("restore")}
                disabled={selectedUserIds.length === 0}
                loading={batchMutation.isPending}
              >
                {t("batch.restoreSelected")}
              </Button>
            </Space>
          )}
        />
      </div>
    </>
  );
}
