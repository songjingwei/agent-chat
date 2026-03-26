"use client";

import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import {
  UserOutlined,
  RobotOutlined,
  MessageOutlined,
  CommentOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/services/stats";
import { queryKeys } from "@/lib/query-keys";
import { useT } from "@/lib/i18n";

const { Title, Text, Paragraph } = Typography;

export default function DashboardPage() {
  const t = useT();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.stats.overview,
    queryFn: () => statsApi.overview(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Text type="danger">
          {t("dashboard.loadError")}: {(error as Error).message}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>{t("dashboard.title")}</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalUsers")}
              value={data?.totalUsers ?? 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalPersonas")}
              value={data?.totalPersonas ?? 0}
              prefix={<RobotOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.activeSessions")}
              value={data?.totalSessions ?? 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalMessages")}
              value={data?.totalMessages ?? 0}
              prefix={<CommentOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            {t("dashboard.systemOverview")}
          </>
        }
        style={{ marginTop: 24 }}
      >
        <Paragraph>
          {t("dashboard.description")}
        </Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("dashboard.refreshHint")}
        </Paragraph>
      </Card>
    </div>
  );
}
