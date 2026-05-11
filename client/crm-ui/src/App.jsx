import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
import QADashboard from "./pages/qa/QADashboard";
import QAReviews from "./pages/qa/QAReviews";
import QAKanban from "./pages/qa/QAKanban";

const App = () => {

  const router = createBrowserRouter([{
    path: "/",
    element: <Layout />,
    children: [{
      path: "/",
      element: <WelcomePage />
    },
    {
      path: "/admin/dashboard",
      element: <AdminDashboard />
    },
    {
      path: "/admin/employees",
      element: <EmployeesDashboard />
    },
    {
      path: "/admin/projects",
      element: <ProjectsDashboard />
    },
    {
      path: "/admin/kanban",
      element: <KanbanDashboard />
    },
    {
      path: "/admin/reports",
      element: <ReportsDashboard />
    },
    {
      path: "/admin/trash",
      element: <TrashDashboard />
    },
    {
      path: "/teamlead/dashboard",
      element: <TeamLeadDashboard />
    },
    {
      path: "/teamLead/projects",
      element: <TeamLeadProjects />
    },
    {
      path: "/teamLead/kanban",
      element: <TeamLeadKanban />
    },
    {
      path: "/teamLead/team",
      element: <TeamLeadTeam />
    },
    {
      path: "/developer/dashboard",
      element: <DeveloperDashboard />
    },
    {
      path: "/developer/my-tasks",
      element: <DeveloperTasks />
    },
    {
      path: "/developer/kanban",
      element: <DeveloperKanban />
    },
    {
      path: "/qa/dashboard",
      element: <QADashboard />
    },
    {
      path: "/qa/reviews",
      element: <QAReviews />
    },
    {
      path: "/qa/kanban",
      element: <QAKanban />
    }
    ]
  }])

  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
