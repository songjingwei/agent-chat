"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/lib/auth-store";
import { useT } from "@/lib/i18n";

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

interface LoginResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  admin: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  };
}

const BASE_URL =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3001";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [messageApi, contextHolder] = message.useMessage();
  const t = useT();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = (await res.json()) as {
        success: boolean;
        data: LoginResponse;
        error?: { message?: string };
      };

      if (!res.ok || !json.success) {
        messageApi.error(json.error?.message ?? t("login.error.failed"));
        return;
      }

      setAuth({
        accessToken: json.data.tokens.accessToken,
        refreshToken: json.data.tokens.refreshToken,
        admin: json.data.admin,
      });
      navigate("/dashboard", { replace: true });
    } catch {
      messageApi.error(t("login.error.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f0f2f5",
        }}
      >
        <Card style={{ width: 400, boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              {t("app.title")}
            </Title>
            <Typography.Text type="secondary">
              {t("app.subtitle")}
            </Typography.Text>
          </div>
          <Form<LoginForm>
            name="login"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: t("login.error.username") },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("login.username")}
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: t("login.error.password") },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("login.password")}
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                {t("login.submit")}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </>
  );
}
