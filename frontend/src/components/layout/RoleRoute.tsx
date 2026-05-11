import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { UserRole } from "../../types/auth";

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isLoading, token } = useAuthStore();

  if (isLoading || (token && !user)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-woreda-background text-woreda-text">
        <div className="border border-woreda-border bg-woreda-surface px-5 py-4 text-sm font-semibold shadow-none">
          Loading permissions...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const defaultPath =
      user.role === "HIBRET_ADMIN"
        ? "/hibret/dashboard"
        : user.role === "WOREDA_ADMIN"
          ? "/woreda/dashboard"
        : user.role === "MEMBER"
            ? "/member/dashboard"
            : "/unauthorized";

    return <Navigate to={defaultPath} replace />;
  }

  return <Outlet />;
}
