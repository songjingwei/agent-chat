"use client";

import { Typography, Empty } from "antd";
import { AuditOutlined } from "@ant-design/icons";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function AuditLogsPage() {
  const t = useT();

  return (
    <div>
      <Title level={4}>{t("auditLogs.title")}</Title>
      <Empty
        image={<AuditOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description={t("auditLogs.notImplemented")}
        style={{ marginTop: 64 }}
      />
    </div>
  );
}
