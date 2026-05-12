import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
  tone?: "primary" | "success" | "magenta" | "muted";
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </span>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard title="Forms" value="0" description="Total forms" />
        <InfoCard title="Reports" value="0" description="Submitted reports" />
        <InfoCard title="Members" value="0" description="Registered members" />
        <InfoCard title="Reviews" value="0" description="Pending reviews" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics overview</CardTitle>
          <CardDescription>
            Analytics will appear here as reporting data is generated from directives and submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No analytics records are available yet.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
