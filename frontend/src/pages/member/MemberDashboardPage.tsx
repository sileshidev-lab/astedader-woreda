import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FolderOpen, IdCard, Megaphone, UserCircle2 } from "lucide-react";
import { getMyMemberProfile } from "../../services/woredaMemberService";
import type { WoredaMember } from "../../services/woredaMemberService";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";

type StatTone = "default" | "success" | "warning";

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof IdCard;
  tone?: StatTone;
}) {
  const labelToneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneClass}`}
        >
          {label}
        </span>
        <Icon size={16} className="text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

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
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Profile completion"
          value={`${member?.profileCompletion ?? 0}%`}
          icon={UserCircle2}
          tone="success"
        />
        <StatTile
          label="Hibret"
          value={member?.hibretName || "-"}
          icon={BookOpen}
        />
        <StatTile
          label="Family"
          value={member?.familyName || "-"}
          icon={IdCard}
        />
        <StatTile
          label="Membership"
          value={member?.membershipStatus || "-"}
          icon={IdCard}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Open the modules available to member accounts on this system.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="default" size="default">
              <Link to="/member/broadcasts" className="inline-flex items-center gap-2">
                <Megaphone aria-hidden />
                Broadcasts
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/member/resources" className="inline-flex items-center gap-2">
                <FolderOpen aria-hidden />
                Resources
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/member/profile" className="inline-flex items-center gap-2">
                <UserCircle2 aria-hidden />
                Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
