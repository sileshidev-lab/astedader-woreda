import { MembersRegistryPage } from "../../shared/members/MembersRegistryPage";
import { useAuthStore } from "../../../stores/authStore";

export function HibretMembersPage() {
  const { user } = useAuthStore();

  return (
    <MembersRegistryPage
      title="Members"
      subtitle="የአባላት መረጃ"
      memberDetailBasePath="/hibret/members"
      scopeHibretId={user?.hibretId ?? undefined}
      showHibretFilter={false}
      showAddButton
      showImportButton
    />
  );
}
