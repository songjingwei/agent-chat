"use client";

import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  Spin,
  Button,
  Space,
  Progress,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { reportsApi } from "@/services/reports";
import StatusTag from "@/components/StatusTag";
import JsonViewer from "@/components/JsonViewer";
import { useT } from "@/lib/i18n";

const { Title, Text, Paragraph } = Typography;

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const reportId = params.id ?? "";

  const { data: report, isLoading } = useQuery({
    queryKey: queryKeys.reports.detail(reportId),
    queryFn: () => reportsApi.get(reportId),
    enabled: Boolean(reportId),
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Text type="danger">Report not found</Text>
      </div>
    );
  }

  const scoreColor =
    (report.compatibilityScore ?? 0) >= 70
      ? "#52c41a"
      : (report.compatibilityScore ?? 0) >= 40
        ? "#faad14"
        : "#ff4d4f";

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/reports")}
        >
          {t("common.back")}
        </Button>
      </Space>

      <Title level={4}>{t("reports.detail")}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">
            <span style={{ fontFamily: "monospace" }}>{report.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t("table.status")}>
            <StatusTag status={report.status} />
          </Descriptions.Item>
          <Descriptions.Item label={t("table.sessionId")}>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/sessions/${report.sessionId}`)}
              style={{ padding: 0 }}
            >
              {report.sessionId}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label={t("table.createdAt")}>
            {dayjs(report.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {report.compatibilityScore != null && (
        <Card title={t("reports.compatibilityScore")} style={{ marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <Progress
              type="dashboard"
              percent={report.compatibilityScore}
              strokeColor={scoreColor}
              size={200}
            />
          </div>
        </Card>
      )}

      {report.summary && (
        <Card title={t("reports.summary")} style={{ marginBottom: 24 }}>
          <Paragraph>{report.summary}</Paragraph>
        </Card>
      )}

      {report.recommendation && (
        <Card title={t("reports.recommendation")} style={{ marginBottom: 24 }}>
          <Paragraph>{report.recommendation}</Paragraph>
        </Card>
      )}

      {report.analysisData && (
        <JsonViewer
          data={report.analysisData}
          title={t("reports.analysisData")}
          defaultOpen
        />
      )}
    </div>
  );
}
