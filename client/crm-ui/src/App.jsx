import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomePage from "./pages/WelcomePage";
import Layout from "./components/Layout";
import AdminDashboard from "./pages/admin/AdminDashboard"
import EmployeesDashboard from "./pages/admin/EmployeesDashboard";
import ProjectsDashboard from "./pages/admin/ProjectsDashboard";
import KanbanDashboard from "./pages/admin/KanbanDashboard";
import ReportsDashboard from "./pages/admin/ReportsDashboard";
import TrashDashboard from "./pages/admin/TrashDashboard";
import TeamLeadDashboard from "./pages/teamLead/TeamLeadDashboard";
import TeamLeadProjects from "./pages/teamLead/TeamLeadProjects";
import TeamLeadKanban from "./pages/teamLead/TeamLeadKanban";
import TeamLeadTeam from "./pages/teamLead/TeamLeadTeam";
import DeveloperDashboard from "./pages/developer/DeveloperDashboard";
import DeveloperTasks from "./pages/developer/DeveloperTasks";
import DeveloperKanban from "./pages/developer/DeveloperKanban";
import DeveloperProjects from "./pages/developer/DeveloperProjects";
import QADashboard from "./pages/qa/QADashboard";
import QAReviews from "./pages/qa/QAReviews";
import QAKanban from "./pages/qa/QAKanban";
import QAProjects from "./pages/qa/QAProjects";
import AuditLogs from "./pages/common/AuditLogs";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import { Toaster } from "sonner";

const App = () => {

  const router = createBrowserRouter([{
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <WelcomePage />
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />
      },
      {
        path: "/reset-password",
        element: <ResetPassword />
      },
      // Admin Routes
      {
        path: "/admin/dashboard",
        element: <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/employees",
        element: <ProtectedRoute allowedRoles={["admin"]}><EmployeesDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/projects",
        element: <ProtectedRoute allowedRoles={["admin"]}><ProjectsDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/kanban",
        element: <ProtectedRoute allowedRoles={["admin"]}><KanbanDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/reports",
        element: <ProtectedRoute allowedRoles={["admin"]}><ReportsDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/trash",
        element: <ProtectedRoute allowedRoles={["admin"]}><TrashDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/audit-logs",
        element: <ProtectedRoute allowedRoles={["admin"]}><AuditLogs /></ProtectedRoute>
      },
      // Team Lead Routes
      {
        path: "/teamlead/dashboard",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><TeamLeadDashboard /></ProtectedRoute>
      },
      {
        path: "/teamLead/projects",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><TeamLeadProjects /></ProtectedRoute>
      },
      {
        path: "/teamLead/kanban",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><TeamLeadKanban /></ProtectedRoute>
      },
      {
        path: "/teamLead/team",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><TeamLeadTeam /></ProtectedRoute>
      },
      {
        path: "/teamLead/audit-logs",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><AuditLogs /></ProtectedRoute>
      },
      // Developer Routes
      {
        path: "/developer/dashboard",
        element: <ProtectedRoute allowedRoles={["developer", "admin"]}><DeveloperDashboard /></ProtectedRoute>
      },
      {
        path: "/developer/my-tasks",
        element: <ProtectedRoute allowedRoles={["developer", "admin"]}><DeveloperTasks /></ProtectedRoute>
      },
      {
        path: "/developer/kanban",
        element: <ProtectedRoute allowedRoles={["developer", "admin"]}><DeveloperKanban /></ProtectedRoute>
      },
      {
        path: "/developer/projects",
        element: <ProtectedRoute allowedRoles={["developer", "admin"]}><DeveloperProjects /></ProtectedRoute>
      },
      {
        path: "/developer/audit-logs",
        element: <ProtectedRoute allowedRoles={["developer", "admin"]}><AuditLogs /></ProtectedRoute>
      },
      // QA Routes
      {
        path: "/qa/dashboard",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><QADashboard /></ProtectedRoute>
      },
      {
        path: "/qa/reviews",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><QAReviews /></ProtectedRoute>
      },
      {
        path: "/qa/kanban",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><QAKanban /></ProtectedRoute>
      },
      {
        path: "/qa/projects",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><QAProjects /></ProtectedRoute>
      },
      {
        path: "/qa/audit-logs",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><AuditLogs /></ProtectedRoute>
      },
      {
        path: "*",
        element: <Navigate to="/" replace />
      }
    ]
  }])

  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
