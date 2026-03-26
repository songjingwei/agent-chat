"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { useState } from "react";
import { useI18nStore } from "@/lib/i18n";

const antdLocales = { en: enUS, zh: zhCN } as const;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  const locale = useI18nStore((s) => s.locale);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={antdLocales[locale]}
        theme={{
          token: {
            colorPrimary: "#1677ff",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}
