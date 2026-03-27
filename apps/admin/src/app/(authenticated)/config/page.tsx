"use client";

import { useState } from "react";
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
import { showBatchResult } from "@/lib/batch-feedback";
import type { SortOrder, TimeSortBy } from "@/lib/time-sort";
import { configApi, type ConfigItem } from "@/services/config";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();
  const [form] = Form.useForm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedConfigKeys, setSelectedConfigKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<TimeSortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.configs.all, { sortBy, sortOrder }],
    queryFn: () => configApi.list({ sortBy, sortOrder }),
  });

  const upsertMutation = useMutation({
    mutationFn: ({
      key,
      configValue,
      valueType,
      description,
      isSecret,
    }: {
      key: string;
      configValue: string;
      valueType: "string" | "number" | "boolean" | "json";
      description?: string;
      isSecret?: boolean;
    }) => configApi.upsert(key, { configValue, valueType, description, isSecret }),
    onSuccess: () => {
      messageApi.success(t("config.saveSuccess"));
      setModalOpen(false);
      setEditingKey(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (keys: string[]) => configApi.batchDelete(keys),
    onSuccess: (result) => {
      showBatchResult(messageApi, t, result);
      setSelectedConfigKeys((prev) =>
        prev.filter((key) => !result.succeededIds.includes(key)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => configApi.delete(key),
    onSuccess: () => {
      messageApi.success(t("config.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.configs.all });
    },
    onError: (err: Error) => {
      messageApi.error(err.message);
    },
  });

  const handleAdd = () => {
    setEditingKey(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (item: ConfigItem) => {
    setEditingKey(item.configKey);
    form.setFieldsValue({
      key: item.configKey,
      configValue: item.configValue,
      valueType: item.valueType,
      description: item.description ?? "",
      isSecret: item.isSecret,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      upsertMutation.mutate({
        key: values.key as string,
        configValue: values.configValue as string,
        valueType: values.valueType as "string" | "number" | "boolean" | "json",
        description: (values.description as string) || undefined,
        isSecret: Boolean(values.isSecret),
      });
    });
  };

  const runBatchDelete = () => {
    if (selectedConfigKeys.length === 0) return;
    Modal.confirm({
      title: t("batch.confirmTitle"),
      content: t("batch.confirmContent", {
        action: t("batch.deleteSelected"),
        count: String(selectedConfigKeys.length),
      }),
      okText: t("common.delete"),
      okButtonProps: { danger: true },
      onOk: () => batchDeleteMutation.mutateAsync(selectedConfigKeys),
    });
  };

  const configItems: ConfigItem[] = data?.items ?? [];

  const columns: ColumnsType<ConfigItem> = [
    {
      title: t("table.key"),
      dataIndex: "configKey",
      key: "configKey",
      width: 250,
      render: (key: string) => (
        <span style={{ fontFamily: "monospace" }}>{key}</span>
      ),
    },
    {
      title: t("table.value"),
      dataIndex: "configValue",
      key: "configValue",
      ellipsis: true,
    },
    {
      title: t("table.type"),
      dataIndex: "valueType",
      key: "valueType",
      width: 120,
    },
    {
      title: t("table.description"),
      dataIndex: "description",
      key: "description",
      width: 250,
      ellipsis: true,
    },
    {
      title: t("table.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A"),
    },
    {
      title: t("table.actions"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: ConfigItem) => (
        <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
          >
            {t("table.edit")}
          </Button>
          <Popconfirm
            title={t("config.deleteConfirm")}
            onConfirm={() => deleteMutation.mutate(record.configKey)}
            okText={t("common.delete")}
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              {t("table.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>
              {t("config.title")}
            </Title>
            <Select
              value={sortBy}
              style={{ width: 150 }}
              onChange={(value: TimeSortBy) => {
                setSortBy(value);
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
              }}
              options={[
                { label: t("sort.desc"), value: "desc" },
                { label: t("sort.asc"), value: "asc" },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {t("config.addConfig")}
          </Button>
        </div>

        <Table<ConfigItem>
          columns={columns}
          dataSource={configItems}
          loading={isLoading}
          rowKey="configKey"
          rowSelection={{
            selectedRowKeys: selectedConfigKeys,
            onChange: (keys) =>
              setSelectedConfigKeys(keys.map((key) => String(key))),
          }}
          pagination={false}
          size="middle"
          title={() => (
            <Space wrap>
              <Typography.Text>
                {t("batch.selectedCount", { count: String(selectedConfigKeys.length) })}
              </Typography.Text>
              <Button
                danger
                onClick={runBatchDelete}
                disabled={selectedConfigKeys.length === 0}
                loading={batchDeleteMutation.isPending}
              >
                {t("batch.deleteSelected")}
              </Button>
            </Space>
          )}
        />

        <Modal
          title={editingKey ? t("config.editConfig") : t("config.addConfig")}
          open={modalOpen}
          onOk={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditingKey(null);
            form.resetFields();
          }}
          confirmLoading={upsertMutation.isPending}
          okText={t("common.save")}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label={t("table.key")}
              name="key"
              rules={[{ required: true, message: t("config.keyRequired") }]}
            >
              <Input
                placeholder="e.g. llm.provider"
                disabled={!!editingKey}
                style={{ fontFamily: "monospace" }}
              />
            </Form.Item>
            <Form.Item
              label={t("table.value")}
              name="configValue"
              rules={[{ required: true, message: t("config.valueRequired") }]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("config.valuePlaceholder")}
                style={{ fontFamily: "monospace" }}
              />
            </Form.Item>
            <Form.Item
              label={t("table.type")}
              name="valueType"
              initialValue="string"
              rules={[{ required: true, message: t("config.typeRequired") }]}
            >
              <Select
                options={[
                  { label: "string", value: "string" },
                  { label: "number", value: "number" },
                  { label: "boolean", value: "boolean" },
                  { label: "json", value: "json" },
                ]}
              />
            </Form.Item>
            <Form.Item label={t("table.description")} name="description">
              <Input placeholder={t("config.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item
              label={t("table.secret")}
              name="isSecret"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}
