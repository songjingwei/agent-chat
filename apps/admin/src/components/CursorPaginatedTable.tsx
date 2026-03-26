"use client";

import { useState, useCallback } from "react";
import { Table, Button, Space } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import { useT } from "@/lib/i18n";

interface CursorPaginatedTableProps<T extends object> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading: boolean;
  nextCursor: string | null | undefined;
  onCursorChange: (cursor: string | undefined) => void;
  rowKey: string | ((record: T) => string);
  rowSelection?: TableRowSelection<T>;
  toolbar?: React.ReactNode;
  size?: "small" | "middle" | "large";
}

export default function CursorPaginatedTable<T extends object>({
  columns,
  dataSource,
  loading,
  nextCursor,
  onCursorChange,
  rowKey,
  rowSelection,
  toolbar,
  size = "middle",
}: CursorPaginatedTableProps<T>) {
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const t = useT();

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    onCursorChange(nextCursor);
  }, [nextCursor, onCursorChange]);

  const handlePrev = useCallback(() => {
    setCursorStack((prev) => {
      const newStack = [...prev];
      newStack.pop();
      const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
      onCursorChange(prevCursor);
      return newStack;
    });
  }, [onCursorChange]);

  const hasPrev = cursorStack.length > 0;

  return (
    <div>
      {toolbar ? <div style={{ marginBottom: 12 }}>{toolbar}</div> : null}
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        pagination={false}
        size={size}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 16,
        }}
      >
        <Space>
          <Button
            icon={<LeftOutlined />}
            disabled={!hasPrev}
            onClick={handlePrev}
          >
            {t("table.previous")}
          </Button>
          <Button
            icon={<RightOutlined />}
            disabled={!nextCursor}
            onClick={handleNext}
          >
            {t("table.next")}
          </Button>
        </Space>
      </div>
    </div>
  );
}
