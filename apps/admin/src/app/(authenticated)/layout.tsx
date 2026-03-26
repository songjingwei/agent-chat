"use client";

import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
