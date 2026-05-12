import { Link } from "react-router-dom";
import { Newspaper, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublishedBroadcastsPage } from "../../shared/content/PublishedBroadcastsPage";
import { useAuthStore } from "../../../stores/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";

export function BroadcastsPage() {
  const { t } = useTranslation();
  const { hasPrivilege } = useAuthStore();
  const canCreate = hasPrivilege("broadcast.create");

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-visible md:overflow-hidden">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-14 sm:w-14">
              <Newspaper size={24} aria-hidden />
            </div>

            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                {t("broadcasts.list.eyebrow")}
              </p>
              <CardTitle>{t("broadcasts.list.title")}</CardTitle>
              <CardDescription>{t("broadcasts.list.subtitle")}</CardDescription>
            </div>
          </div>

          {canCreate ? (
            <Button asChild variant="default" size="default" className="w-full sm:w-auto">
              <Link to="/woreda/broadcasts/new">
                <Plus aria-hidden />
                {t("broadcasts.list.actions.new")}
              </Link>
            </Button>
          ) : null}
        </CardHeader>
      </Card>

      <Card className="min-h-0 flex-1 overflow-visible md:overflow-hidden">
        <CardContent className="p-0">
          <PublishedBroadcastsPage
            title={t("broadcasts.list.feedTitle")}
            subtitle={t("broadcasts.list.feedSubtitle")}
            detailBasePath="/woreda/broadcasts"
          />
        </CardContent>
      </Card>
    </section>
  );
}
