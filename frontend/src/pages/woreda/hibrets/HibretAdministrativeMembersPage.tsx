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
      scopeHibretId={hibretId}
      memberDetailBasePath="/woreda/members"
      showAddButton={true}
      showImportButton={true}
      controlBarLeading={controlBarLeading}
    />
  );
}
