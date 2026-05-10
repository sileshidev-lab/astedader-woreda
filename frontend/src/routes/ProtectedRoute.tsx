import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, token } = useAuthStore();

  if (isLoading || (token && !isAuthenticated)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-woreda-background text-woreda-text">
        <div className="border border-woreda-border bg-woreda-surface px-5 py-4 text-sm font-semibold shadow-none">
          Loading account...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
