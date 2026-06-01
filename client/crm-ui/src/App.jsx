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
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeKanban from "./pages/employee/EmployeeKanban";
import EmployeeProjects from "./pages/employee/EmployeeProjects";
import QADashboard from "./pages/qa/QADashboard";
import QAReviews from "./pages/qa/QAReviews";
import QAKanban from "./pages/qa/QAKanban";
import QAProjects from "./pages/qa/QAProjects";
import AuditLogs from "./pages/common/AuditLogs";
import OrganizationTree from "./pages/common/OrganizationTree";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProjectDetails from "./pages/common/ProjectDetails";
import MyTeam from "./pages/common/MyTeam";
import HRDashboard from "./pages/hr/HRDashboard";
import HREmployees from "./pages/hr/HREmployees";
import HRLeaveManagement from "./pages/hr/HRLeaveManagement";
import HRReports from "./pages/hr/HRReports";
import HRNotifications from "./pages/hr/HRNotifications";
import EmployeeLeaves from "./pages/employee/EmployeeLeaves";

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
      {
        path: "/projects/:projectId",
        element: <ProtectedRoute allowedRoles={["admin", "TL", "employee", "qa"]}><ProjectDetails /></ProtectedRoute>
      },
      // Admin Routes
      {
        path: "/admin/dashboard",
        element: <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/employees",
        element: <ProtectedRoute allowedRoles={["admin"]} requiredPermission={["users.create", "users.update"]}><EmployeesDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/projects",
        element: <ProtectedRoute allowedRoles={["admin"]} requiredPermission={["projects.create", "projects.update"]}><ProjectsDashboard /></ProtectedRoute>
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
        element: <ProtectedRoute allowedRoles={["admin"]} requiredPermission="trash.view"><TrashDashboard /></ProtectedRoute>
      },
      {
        path: "/admin/audit-logs",
        element: <ProtectedRoute allowedRoles={["admin"]}><AuditLogs /></ProtectedRoute>
      },
      {
        path: "/admin/organization-tree",
        element: <ProtectedRoute allowedRoles={["admin"]}><OrganizationTree /></ProtectedRoute>
      },
      // HR Routes
      {
        path: "/hr/dashboard",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><HRDashboard /></ProtectedRoute>
      },
      {
        path: "/hr/employees",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><HREmployees /></ProtectedRoute>
      },
      {
        path: "/hr/leaves",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><HRLeaveManagement /></ProtectedRoute>
      },
      {
        path: "/hr/organization-tree",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><OrganizationTree /></ProtectedRoute>
      },
      {
        path: "/hr/reports",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><HRReports /></ProtectedRoute>
      },
      {
        path: "/hr/notifications",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><HRNotifications /></ProtectedRoute>
      },
      {
        path: "/hr/my-team",
        element: <ProtectedRoute allowedRoles={["hr", "admin"]}><MyTeam /></ProtectedRoute>
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
      {
        path: "/teamLead/organization-tree",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><OrganizationTree /></ProtectedRoute>
      },
      {
        path: "/teamLead/reports",
        element: <ProtectedRoute allowedRoles={["TL", "admin"]}><ReportsDashboard /></ProtectedRoute>
      },
      // Employee Routes
      {
        path: "/employee/dashboard",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><EmployeeDashboard /></ProtectedRoute>
      },
      {
        path: "/employee/my-tasks",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><EmployeeTasks /></ProtectedRoute>
      },
      {
        path: "/employee/kanban",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><EmployeeKanban /></ProtectedRoute>
      },
      {
        path: "/employee/projects",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><EmployeeProjects /></ProtectedRoute>
      },
      {
        path: "/employee/audit-logs",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><AuditLogs /></ProtectedRoute>
      },
      {
        path: "/employee/organization-tree",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><OrganizationTree /></ProtectedRoute>
      },
      {
        path: "/employee/my-team",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><MyTeam /></ProtectedRoute>
      },
      {
        path: "/employee/leaves",
        element: <ProtectedRoute allowedRoles={["employee", "TL", "qa", "admin"]}><EmployeeLeaves /></ProtectedRoute>
      },
      {
        path: "/employee/reports",
        element: <ProtectedRoute allowedRoles={["employee", "admin"]}><ReportsDashboard /></ProtectedRoute>
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
        path: "/qa/organization-tree",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><OrganizationTree /></ProtectedRoute>
      },
      {
        path: "/qa/my-team",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><MyTeam /></ProtectedRoute>
      },
      {
        path: "/qa/reports",
        element: <ProtectedRoute allowedRoles={["qa", "admin"]}><ReportsDashboard /></ProtectedRoute>
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
