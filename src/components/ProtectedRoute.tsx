import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homePathFor, useAuth } from "@/lib/auth";
import type { Role } from "@/data/types";

export function ProtectedRoute({ role }: { role: Role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
