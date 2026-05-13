import { MembersRegistryPage } from "../../shared/members/MembersRegistryPage";
import { useAuthStore } from "../../../store/authStore";

export function HibretMembersPage() {
  const { user } = useAuthStore();
  const hibretId = (user as any)?.hibretId;

  return (
    <MembersRegistryPage
      scopeHibretId={hibretId}
      memberDetailBasePath="/hibret/members"
      showAddButton={true}
      showImportButton={true}
    />
  );
}
