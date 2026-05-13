import { MembersRegistryPage } from "../../shared/members/MembersRegistryPage";

export function MembersPage() {
  return (
    <MembersRegistryPage
      memberDetailBasePath="/woreda/members"
      showAddButton={true}
      showImportButton={true}
    />
  );
}
