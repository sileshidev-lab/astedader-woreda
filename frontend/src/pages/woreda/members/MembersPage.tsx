import { MembersRegistryPage } from "../../shared/members/MembersRegistryPage";

export function MembersPage() {
  return (
    <MembersRegistryPage
      title="Members"
      subtitle="የአባላት መረጃ"
      memberDetailBasePath="/woreda/members"
      showAddButton
      showImportButton
    />
  );
}
