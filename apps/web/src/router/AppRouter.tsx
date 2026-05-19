import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../App";
import { LoginPage } from "../pages/auth/LoginPage";
import { SignupPage } from "../pages/auth/SignupPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { MemberDetailPage } from "../pages/members/MemberDetailPage";
import { MembersPage } from "../pages/members/MembersPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/members", element: <MembersPage /> },
          { path: "/members/:memberId", element: <MemberDetailPage /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
