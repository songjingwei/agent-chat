import { Modal, Typography } from "antd";
import type { MessageInstance } from "antd/es/message/interface";

export interface BatchFailureItem {
  id: string;
  code: string;
  message: string;
}

export interface BatchResult<TAction extends string = string> {
  action: TAction;
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  succeededIds: string[];
  failedItems: BatchFailureItem[];
}

export function showBatchResult(
  messageApi: MessageInstance,
  t: (key: string, params?: Record<string, string>) => string,
  result: BatchResult,
) {
  const summary = t("batch.completed", {
    success: String(result.succeededCount),
    failed: String(result.failedCount),
  });

  if (result.failedCount === 0) {
    messageApi.success(summary);
    return;
  }

  messageApi.warning(summary);
  Modal.info({
    title: t("batch.failedDetailsTitle"),
    width: 760,
    content: (
      <div style={{ maxHeight: 360, overflow: "auto" }}>
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          {t("batch.failedDetailsSummary", {
            count: String(result.failedCount),
          })}
        </Typography.Paragraph>
        {result.failedItems.map((item) => (
          <Typography.Paragraph key={`${item.id}:${item.code}`} style={{ marginBottom: 8 }}>
            <Typography.Text code>{item.id}</Typography.Text>
            {" - "}
            <Typography.Text>{item.code}</Typography.Text>
            {" - "}
            <Typography.Text type="secondary">{item.message}</Typography.Text>
          </Typography.Paragraph>
        ))}
      </div>
    ),
  });
}
