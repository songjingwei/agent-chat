import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import RootLayout from "@/app/layout";
import RootPage from "@/app/page";
import LoginPage from "@/app/login/page";
import AuthenticatedLayout from "@/app/(authenticated)/layout";
import DashboardPage from "@/app/(authenticated)/dashboard/page";
import UsersPage from "@/app/(authenticated)/users/page";
import UserDetailPage from "@/app/(authenticated)/users/[id]/page";
import PersonasPage from "@/app/(authenticated)/personas/page";
import PersonaDetailPage from "@/app/(authenticated)/personas/[id]/page";
import SessionsPage from "@/app/(authenticated)/sessions/page";
import SessionDetailPage from "@/app/(authenticated)/sessions/[id]/page";
import ReportsPage from "@/app/(authenticated)/reports/page";
import ReportDetailPage from "@/app/(authenticated)/reports/[id]/page";
import MemoryPage from "@/app/(authenticated)/memory/page";
import ConfigPage from "@/app/(authenticated)/config/page";
import AuditLogsPage from "@/app/(authenticated)/audit-logs/page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<RootPage />} />
          <Route path="login" element={<LoginPage />} />

          <Route element={<AuthenticatedLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="personas/:id" element={<PersonaDetailPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportDetailPage />} />
            <Route path="memory" element={<MemoryPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
