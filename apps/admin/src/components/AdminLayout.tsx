"use client";

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, Select, theme, type MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  RobotOutlined,
  MessageOutlined,
  BarChartOutlined,
  BulbOutlined,
  SettingOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/lib/auth-store";
import { useT, useI18nStore } from "@/lib/i18n";

const { Sider, Header, Content } = Layout;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const admin = useAuthStore((s) => s.admin);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const t = useT();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems: MenuProps["items"] = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: t("menu.dashboard") },
    { key: "/users", icon: <UserOutlined />, label: t("menu.users") },
    { key: "/personas", icon: <RobotOutlined />, label: t("menu.personas") },
    { key: "/sessions", icon: <MessageOutlined />, label: t("menu.sessions") },
    { key: "/reports", icon: <BarChartOutlined />, label: t("menu.reports") },
    { key: "/memory", icon: <BulbOutlined />, label: t("menu.memory") },
    { key: "/config", icon: <SettingOutlined />, label: t("menu.config") },
    { key: "/audit-logs", icon: <AuditOutlined />, label: t("menu.auditLogs") },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  // Determine the selected menu key from current pathname
  const selectedKey =
    menuItems
      ?.map((item) => (item as { key: string }).key)
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] ?? "/dashboard";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 48,
            margin: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: collapsed ? 16 : 18,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {collapsed ? "AC" : t("app.title")}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 48, height: 48 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Select
              value={locale}
              onChange={setLocale}
              style={{ width: 120 }}
              size="small"
              suffixIcon={<GlobalOutlined />}
              options={[
                { label: "English", value: "en" },
                { label: "中文", value: "zh" },
              ]}
            />
            <span>
              {admin?.displayName ?? admin?.username ?? "Admin"}
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              {t("header.logout")}
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
