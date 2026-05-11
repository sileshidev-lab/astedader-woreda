import { Navigate, useParams } from "react-router-dom";

export function HibretPoliticalPage() {
  const { hibretId } = useParams();

  if (!hibretId) {
    return <Navigate to="/woreda/hibrets" replace />;
  }

  return <Navigate to={`/woreda/hibrets/${encodeURIComponent(hibretId)}?side=political`} replace />;
}

