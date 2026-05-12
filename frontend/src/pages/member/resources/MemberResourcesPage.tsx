import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { getResources } from "../../../services/contentService";
import type { ResourceItem } from "../../../services/contentService";
import {
  getFileDownloadUrl,
  getFilePreviewUrl,
} from "../../../services/announcementService";
import { EmptyState } from "../../../components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { statusToBadgeVariant } from "@/lib/badge";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function fileKind(mimeType?: string | null) {
  if (!mimeType) return "File";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Image";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "Spreadsheet";
  if (mimeType.includes("presentation")) return "Presentation";
  return "Document";
}

const ALL_CATEGORIES = "__all__";

function MetricTile({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "default" | "success" | "warning";
}) {
  const labelToneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneClass}`}
        >
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        {note ? (
          <p className="mt-2 text-xs font-normal text-muted-foreground">
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MemberResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadResources() {
    try {
      const data = await getResources();
      setResources(
        data.resources.filter(
          (item) =>
            item.status === "published" && item.targetRoles.includes("MEMBER"),
        ),
      );
    } catch {
      toast.error("Unable to load resources.");
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(resources.map((item) => item.category).filter(Boolean)),
    ).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return resources.filter((resource) => {
      if (categoryFilter && resource.category !== categoryFilter) return false;
      if (!query) return true;

      return [
        resource.title,
        resource.description,
        resource.category,
        resource.file?.originalName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categoryFilter, resources, searchText]);

  return (
    <section className="aw-design-page aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Available resources"
          value={resources.length}
          note="Published items ready to open"
        />
        <MetricTile
          label="Categories"
          value={categories.length}
          note="Topics represented in the library"
        />
        <MetricTile
          label="Matching results"
          value={filteredResources.length}
          note="Current filtered view"
          tone="success"
        />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b border-border xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              Resource Library
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Published official files and documents available to members.
            </CardDescription>
          </div>

          <div className="ml-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search resources"
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="default"
              className="sm:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="member-resources-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>

            <div
              id="member-resources-mobile-filters"
              className={
                mobileFiltersOpen
                  ? "flex flex-col gap-2 sm:flex sm:flex-row sm:items-center"
                  : "hidden sm:flex sm:flex-row sm:items-center sm:gap-2"
              }
            >
              <Select
                value={categoryFilter || ALL_CATEGORIES}
                onValueChange={(value) =>
                  setCategoryFilter(value === ALL_CATEGORIES ? "" : value)
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category || ALL_CATEGORIES}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  setSearchText("");
                  setCategoryFilter("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-auto p-5">
          {filteredResources.length === 0 ? (
            <EmptyState
              title="No published resources found"
              message="Try changing the search or category filters."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                      <FileText size={20} aria-hidden />
                    </div>
                    <Badge variant={statusToBadgeVariant("published")}>
                      Published
                    </Badge>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3">
                    <h2 className="line-clamp-2 text-base font-semibold text-foreground">
                      {resource.title}
                    </h2>

                    <p className="line-clamp-3 text-sm font-normal leading-6 text-muted-foreground">
                      {resource.description || "No description recorded."}
                    </p>

                    <div className="space-y-1 text-xs font-normal text-muted-foreground">
                      <p>Category: {resource.category || "-"}</p>
                      <p>
                        Published:{" "}
                        {formatDate(resource.publishedAt || resource.createdAt)}
                      </p>
                      <p>File type: {fileKind(resource.file?.mimeType)}</p>
                      <p className="break-all">
                        File: {resource.file?.originalName || "-"}
                      </p>
                    </div>

                    {resource.file ? (
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                        <Button asChild variant="default" size="sm">
                          <a
                            href={getFilePreviewUrl(resource.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5"
                          >
                            <ExternalLink aria-hidden />
                            View
                          </a>
                        </Button>

                        <Button asChild variant="outline" size="sm">
                          <a
                            href={getFileDownloadUrl(resource.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5"
                          >
                            <Download aria-hidden />
                            Download
                          </a>
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
