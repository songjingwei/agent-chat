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
  Popconfirm,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryKeys } from "@/lib/query-keys";
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

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.configs.all,
    queryFn: () => configApi.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: ({
      key,
      value,
      description,
    }: {
      key: string;
      value: string;
      description?: string;
    }) => configApi.upsert(key, { value, description }),
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
    setEditingKey(item.key);
    form.setFieldsValue({
      key: item.key,
      value: item.value,
      description: item.description ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      upsertMutation.mutate({
        key: values.key as string,
        value: values.value as string,
        description: (values.description as string) || undefined,
      });
    });
  };

  // Normalize data: the API might return an array directly or a paginated response
  const configItems: ConfigItem[] = Array.isArray(data)
    ? data
    : (data as unknown as { items: ConfigItem[] })?.items ?? [];

  const columns: ColumnsType<ConfigItem> = [
    {
      title: t("table.key"),
      dataIndex: "key",
      key: "key",
      width: 250,
      render: (key: string) => (
        <span style={{ fontFamily: "monospace" }}>{key}</span>
      ),
    },
    {
      title: t("table.value"),
      dataIndex: "value",
      key: "value",
      ellipsis: true,
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
            onConfirm={() => deleteMutation.mutate(record.key)}
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
          <Title level={4} style={{ margin: 0 }}>
            {t("config.title")}
          </Title>
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
          rowKey="key"
          pagination={false}
          size="middle"
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
              name="value"
              rules={[{ required: true, message: t("config.valueRequired") }]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("config.valuePlaceholder")}
                style={{ fontFamily: "monospace" }}
              />
            </Form.Item>
            <Form.Item label={t("table.description")} name="description">
              <Input placeholder={t("config.descriptionPlaceholder")} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}
