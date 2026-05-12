import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Search } from "lucide-react";
import { getHibretResources } from "../../../services/hibretPortalService";
import type { ResourceItem } from "../../../services/contentService";
import { getFileDownloadUrl } from "../../../services/announcementService";
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
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
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
      </CardContent>
    </Card>
  );
}

export function HibretResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState("");

  async function loadResources() {
    setError("");

    try {
      const data = await getHibretResources();
      setResources(data.resources);
    } catch {
      setError("Unable to load resources.");
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(resources.map((item) => item.category).filter(Boolean)),
    ).sort() as string[];
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return resources.filter((resource) => {
      if (categoryFilter !== "all" && resource.category !== categoryFilter) return false;
      if (!query) return true;

      return [resource.title, resource.description, resource.category, resource.file?.originalName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categoryFilter, resources, searchText]);

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Available resources" value={resources.length} />
        <StatTile label="Categories" value={categories.length} />
        <StatTile label="Matching results" value={filteredResources.length} tone="success" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Resource library</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Published operational documents and references for Hibret administration.
            </CardDescription>
          </div>
          <div className="ml-auto grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:w-auto">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search resources"
                className="pl-9 sm:w-64"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category-filter" className="sr-only">
                Category
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter" className="sm:w-44">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                setSearchText("");
                setCategoryFilter("all");
              }}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredResources.length === 0 ? (
            <EmptyState
              icon={<FileText aria-hidden />}
              title="No published resources found"
              message="Try a different category or search query."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText aria-hidden />
                    </div>
                    <Badge variant="success">Published</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                        {resource.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {resource.description || "No description recorded."}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Category: {resource.category || "-"}</p>
                      <p>Published: {formatDate(resource.publishedAt || resource.createdAt)}</p>
                      <p className="break-all">File: {resource.file?.originalName || "-"}</p>
                    </div>

                    {resource.file ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={getFileDownloadUrl(resource.file.id) + "&inline=true"}
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
