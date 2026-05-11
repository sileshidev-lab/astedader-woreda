import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyMemberProfile } from "../../services/woredaMemberService";
import type { WoredaMember } from "../../services/woredaMemberService";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatCard } from "../../components/ui/StatCard";

export function MemberDashboardPage() {
  const [member, setMember] = useState<WoredaMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyMemberProfile();
      setMember(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load your dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Profile completion" value={`${member?.profileCompletion ?? 0}%`} />
        <StatCard label="Hibret" value={member?.hibretName || "-"} />
        <StatCard label="Family" value={member?.familyName || "-"} />
        <StatCard label="Membership" value={member?.membershipStatus || "-"} />
      </div>

      <div className="rounded-3xl border border-woreda-border/70 bg-woreda-surface px-5 py-6">
        <h2 className="text-lg font-black text-woreda-text">Quick actions</h2>
        <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
          Open the modules available to member accounts on this system.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/member/broadcasts" className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105">
            Broadcasts
          </Link>
          <Link to="/member/resources" className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
            Resources
          </Link>
          <Link to="/member/profile" className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
            Profile
          </Link>
        </div>
      </div>
    </section>
  );
}

