import { RoleBroadcastsShell } from "../../shared/content/RoleBroadcastsShell";

export function MemberBroadcastsPage() {
  return (
    <RoleBroadcastsShell
      eyebrow="Member Articles"
      title="Broadcasts"
      description="Read official Woreda communication posts in the same article shell and content structure used across the admin system."
      subtitle="Read official Woreda communication posts published for members."
      detailBasePath="/member/broadcasts"
    />
  );
}
