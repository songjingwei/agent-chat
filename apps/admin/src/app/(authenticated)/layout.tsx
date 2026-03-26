"use client";

import { Outlet } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";

export default function AuthenticatedLayout() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AuthGuard>
  );
}
