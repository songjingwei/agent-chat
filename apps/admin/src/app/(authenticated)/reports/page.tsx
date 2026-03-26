"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Select, Space, Tooltip, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { reportsApi, type Report } from "@/services/reports";
import CursorPaginatedTable from "@/components/CursorPaginatedTable";
import StatusTag from "@/components/StatusTag";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function ReportsPage() {
  const navigate = useNavigate();
  const t = useT();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.reports.all, { cursor, status: statusFilter }],
    queryFn: () =>
      reportsApi.list({ cursor, limit: 20, status: statusFilter }),
  });

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
        score != null ? `${score}%` : "N/A",
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
      render: (_: unknown, record: Report) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reports/${record.id}`)}
        >
          {t("table.view")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>{t("reports.title")}</Title>
      <div style={{ marginBottom: 16 }}>
        <Space>
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
              { label: t("status.generated"), value: "generated" },
              { label: t("status.pending"), value: "pending" },
              { label: t("status.failed"), value: "failed" },
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
      />
    </div>
  );
}
