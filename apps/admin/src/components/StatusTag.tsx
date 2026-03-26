"use client";

import { Tag } from "antd";

const statusColorMap: Record<string, string> = {
  active: "green",
  completed: "green",
  draft: "blue",
  pending: "blue",
  building: "blue",
  paused: "orange",
  archived: "red",
  failed: "red",
  deleted: "red",
  generated: "green",
};

interface StatusTagProps {
  status: string;
}

export default function StatusTag({ status }: StatusTagProps) {
  const color = statusColorMap[status] ?? "default";
  return <Tag color={color}>{status}</Tag>;
}
