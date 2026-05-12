import { Newspaper } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { PublishedBroadcastsPage } from "./PublishedBroadcastsPage";

type RoleBroadcastsShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  subtitle: string;
  detailBasePath?: string;
};

export function RoleBroadcastsShell({
  eyebrow,
  title,
  description,
  subtitle,
  detailBasePath,
}: RoleBroadcastsShellProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6 overflow-visible md:overflow-hidden">
      <Card className="shrink-0 overflow-hidden">
        <CardHeader className="flex flex-row items-start gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-14 sm:w-14"
          >
            <Newspaper size={24} />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <CardTitle className="text-base font-semibold sm:text-lg">{title}</CardTitle>
            <CardDescription className="max-w-3xl text-sm text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card className="min-h-0 flex-1 overflow-visible md:overflow-hidden">
        <CardContent className="px-0 py-0">
          <PublishedBroadcastsPage
            title={title}
            subtitle={subtitle}
            detailBasePath={detailBasePath}
          />
        </CardContent>
      </Card>
    </section>
  );
}
