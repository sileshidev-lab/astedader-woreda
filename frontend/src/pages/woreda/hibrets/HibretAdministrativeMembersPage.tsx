import type { ReactNode } from "react";
import { MembersRegistryPage } from "../../shared/members/MembersRegistryPage";

type HibretAdministrativeMembersPageProps = {
  hibretId: string;
  controlBarLeading?: ReactNode;
};

export function HibretAdministrativeMembersPage({
  hibretId,
  controlBarLeading,
}: HibretAdministrativeMembersPageProps) {
  return (
    <MembersRegistryPage
      title="Members"
      subtitle="የአባላት መረጃ"
      memberDetailBasePath="/woreda/members"
      scopeHibretId={hibretId}
      showHibretFilter={false}
      showAddButton
      showImportButton
      controlBarLeading={controlBarLeading}
    />
  );
}

export default HibretAdministrativeMembersPage;
