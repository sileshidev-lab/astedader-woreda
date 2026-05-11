import { Navigate, useParams } from "react-router-dom";

export function HibretAdministrativePage() {
  const { hibretId } = useParams();

  if (!hibretId) {
    return <Navigate to="/woreda/hibrets" replace />;
  }

  return (
    <Navigate to={`/woreda/hibrets/${encodeURIComponent(hibretId)}?side=administrative`} replace />
  );
}

