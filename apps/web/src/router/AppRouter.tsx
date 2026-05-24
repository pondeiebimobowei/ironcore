import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../App";
import { LoginPage } from "../pages/auth/LoginPage";
import { SignupPage } from "../pages/auth/SignupPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { MemberDetailPage } from "../pages/members/MemberDetailPage";
import { MembersPage } from "../pages/members/MembersPage";
import { CompanySetupPage } from "../pages/onboarding/CompanySetupPage";
import { PaymentDetailPage } from "../pages/payments/PaymentDetailPage";
import { PaymentsPage } from "../pages/payments/PaymentsPage";
import { RecordPaymentPage } from "../pages/payments/RecordPaymentPage";
import { RecordPaymentSuccessPage } from "../pages/payments/RecordPaymentSuccessPage";
import { RecoveryQueuePage } from "../pages/recovery/RecoveryQueuePage";
import { BillingPage } from "../pages/settings/BillingPage";
import { OrganizationProfilePage } from "../pages/settings/OrganizationProfilePage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { CreateTaskPage } from "../pages/tasks/CreateTaskPage";
import { TasksPage } from "../pages/tasks/TasksPage";
import { CreateWorkflowPage } from "../pages/workflows/CreateWorkflowPage";
import { WorkflowsPage } from "../pages/workflows/WorkflowsPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/onboarding/company", element: <CompanySetupPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/members", element: <MembersPage /> },
          { path: "/members/:memberId", element: <MemberDetailPage /> },
          { path: "/payments", element: <PaymentsPage /> },
          { path: "/payments/record", element: <RecordPaymentPage /> },
          {
            path: "/payments/record/success/:paymentId",
            element: <RecordPaymentSuccessPage />,
          },
          { path: "/payments/:paymentId", element: <PaymentDetailPage /> },
          { path: "/recovery", element: <RecoveryQueuePage /> },
          { path: "/workflows", element: <WorkflowsPage /> },
          { path: "/workflows/new", element: <CreateWorkflowPage /> },
          { path: "/tasks", element: <TasksPage /> },
          { path: "/tasks/new", element: <CreateTaskPage /> },
          { path: "/settings", element: <SettingsPage /> },
          {
            path: "/settings/organization",
            element: <OrganizationProfilePage />,
          },
          { path: "/settings/billing", element: <BillingPage /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
