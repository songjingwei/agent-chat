"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Select, Space, Tooltip, Button, Modal, message } from "antd";
import { EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { showBatchResult } from "@/lib/batch-feedback";
import type { SortOrder, TimeSortBy } from "@/lib/time-sort";
import { reportsApi, type Report } from "@/services/reports";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

function toPercent(score: number): number {
  if (score <= 1) return Math.round(score * 100);
  return Math.round(score);
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [sortBy, setSortBy] = useState<TimeSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: [
      ...queryKeys.reports.all,
      { cursor, status: statusFilter, sortBy, sortOrder },
    ],
    queryFn: () =>
      reportsApi.list({
        cursor,
        limit: 20,
        status: statusFilter,
        sortBy,
        sortOrder,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(reportId),
    onSuccess: () => {
      messageApi.success(t("reports.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => reportsApi.batchDelete(ids),
    onSuccess: (result) => {
      showBatchResult(messageApi, t, result);
      setSelectedReportIds((prev) =>
        prev.filter((id) => !result.succeededIds.includes(id)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleDelete = (report: Report) => {
    Modal.confirm({
      title: t("reports.deleteConfirmTitle"),
      content: t("reports.deleteConfirmContent"),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(report.id),
    });
  };

  const runBatchDelete = () => {
    if (selectedReportIds.length === 0) return;
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: t("batch.deleteSelected"),
        count: String(selectedReportIds.length),
      }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => batchDeleteMutation.mutateAsync(selectedReportIds),
    });
  };

  const columns: ColumnsType<Report> = [
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
      title: t("table.sessionId"),
      dataIndex: "sessionId",
      key: "sessionId",
      width: 140,
      render: (id: string) => (
        <Tooltip title={id}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>
            {id.slice(0, 8)}...
          </span>
        </Tooltip>
      ),
    },
    {
      title: t("table.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: t("table.compatibilityScore"),
      dataIndex: "compatibilityScore",
      key: "compatibilityScore",
      width: 160,
      render: (score: number | null) =>
        score != null ? `${toPercent(score)}%` : "N/A",
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
      width: 180,
      render: (_: unknown, record: Report) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reports/${record.id}`)}
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
        <Title level={4}>{t("reports.title")}</Title>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder={t("reports.filterStatus")}
              allowClear
              style={{ width: 200 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCursor(undefined);
              }}
              options={[
                { label: t("status.pending"), value: "pending" },
                { label: t("status.generating"), value: "generating" },
                { label: t("status.completed"), value: "completed" },
                { label: t("status.failed"), value: "failed" },
              ]}
            />
            <Select
              value={sortBy}
              style={{ width: 150 }}
              onChange={(value: TimeSortBy) => {
                setSortBy(value);
                setCursor(undefined);
              }}
              options={[
                { label: t("sort.createdAt"), value: "createdAt" },
                { label: t("sort.updatedAt"), value: "updatedAt" },
              ]}
            />
            <Select
              value={sortOrder}
              style={{ width: 140 }}
              onChange={(value: SortOrder) => {
                setSortOrder(value);
                setCursor(undefined);
              }}
              options={[
                { label: t("sort.desc"), value: "desc" },
                { label: t("sort.asc"), value: "asc" },
              ]}
            />
          </Space>
        </div>
        <CursorPaginatedTable<Report>
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          nextCursor={data?.nextCursor}
          onCursorChange={setCursor}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedReportIds,
            onChange: (keys) =>
              setSelectedReportIds(keys.map((key) => String(key))),
          }}
          toolbar={(
            <Space wrap>
              <Typography.Text>
                {t("batch.selectedCount", { count: String(selectedReportIds.length) })}
              </Typography.Text>
              <Button
                danger
                onClick={runBatchDelete}
                disabled={selectedReportIds.length === 0}
                loading={batchDeleteMutation.isPending}
              >
                {t("batch.deleteSelected")}
              </Button>
            </Space>
          )}
        />
      </div>
    </>
  );
}
