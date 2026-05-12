import { PageButton } from "../../../components/ui/PageButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Reports" value={0} />
        <KpiTile label="Approved" value={0} />
        <KpiTile label="Changes requested" value={0} />
        <KpiTile label="Rejected" value={0} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              Hibret report records are accessed from directive and Hibret review flows.
            </CardDescription>
          </div>
          <PageButton>Export Reports</PageButton>
        </CardHeader>
        <CardContent className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No standalone report records are listed on this page.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
