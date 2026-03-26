"use client";

import { Collapse, Typography } from "antd";

const { Text } = Typography;

interface JsonViewerProps {
  data: unknown;
  title?: string;
  defaultOpen?: boolean;
}

export default function JsonViewer({
  data,
  title = "JSON Data",
  defaultOpen = false,
}: JsonViewerProps) {
  const formatted = JSON.stringify(data, null, 2);

  return (
    <Collapse
      defaultActiveKey={defaultOpen ? ["1"] : []}
      items={[
        {
          key: "1",
          label: <Text strong>{title}</Text>,
          children: (
            <pre
              style={{
                background: "#f6f8fa",
                padding: 16,
                borderRadius: 6,
                overflow: "auto",
                maxHeight: 400,
                fontSize: 13,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              <code>{formatted}</code>
            </pre>
          ),
        },
      ]}
    />
  );
}
