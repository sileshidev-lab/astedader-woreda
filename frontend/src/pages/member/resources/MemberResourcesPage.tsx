import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileText, FolderOpen, Search } from "lucide-react";
import { getResources } from "../../../services/contentService";
import type { ResourceItem } from "../../../services/contentService";
import { getFileDownloadUrl, getFilePreviewUrl } from "../../../services/announcementService";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function fileKind(mimeType?: string | null) {
  if (!mimeType) return "File";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Image";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("presentation")) return "Presentation";
  return "Document";
}

export function MemberResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [error, setError] = useState("");

  async function loadResources() {
    setError("");

    try {
      const data = await getResources();
      setResources(
        data.resources.filter(
          (item) => item.status === "published" && item.targetRoles.includes("MEMBER")
        )
      );
    } catch {
      setError("Unable to load resources.");
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(resources.map((item) => item.category).filter(Boolean))).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return resources.filter((resource) => {
      if (categoryFilter && resource.category !== categoryFilter) return false;
      if (!query) return true;

      return [resource.title, resource.description, resource.category, resource.file?.originalName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categoryFilter, resources, searchText]);

  return (
    <section className="aw-design-page aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      <div className="stat-grid shrink-0">
        <Metric label="Available resources" value={resources.length} />
        <Metric label="Categories" value={categories.length} />
        <Metric label="Matching results" value={filteredResources.length} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col border border-woreda-border bg-woreda-surface">
        <div className="shrink-0 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 bg-woreda-yellow" />
              <h1 className="text-xl font-black text-woreda-text">Resource Library</h1>
            </div>
            <p className="text-sm font-semibold text-woreda-textMuted">
              Published official files and documents available to members.
            </p>
          </div>

          <div className="aw-toolbar mt-4">
            <div className="aw-search-wrap">
              <span className="flex items-center px-3 text-woreda-textMuted">
                <Search size={15} />
              </span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search resources"
                className="aw-search-input"
              />
            </div>

            <button
              type="button"
              className="aw-btn aw-btn-outline aw-mobile-filters-toggle md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="member-resources-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <div
              id="member-resources-mobile-filters"
              className={["aw-toolbar-filter-group", mobileFiltersOpen ? "aw-toolbar-filter-group-open" : ""].join(" ")}
            >
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="aw-filter-select"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category || ""}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setCategoryFilter("");
                }}
                className="aw-btn aw-btn-outline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {filteredResources.length === 0 ? (
            <div className="border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-14 text-center text-sm font-semibold text-woreda-textMuted">
              <FolderOpen size={34} className="mx-auto mb-2" />
              No published resources found.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource) => (
                <article key={resource.id} className="border border-woreda-border bg-woreda-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary">
                      <FileText size={22} />
                    </div>
                    <span className="border border-woreda-success/20 bg-woreda-successBg px-2.5 py-1 text-xs font-bold text-woreda-success">
                      Published
                    </span>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-xl font-black text-woreda-text">
                    {resource.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-woreda-textMuted">
                    {resource.description || "No description recorded."}
                  </p>

                  <div className="mt-4 space-y-1 text-xs font-semibold text-woreda-textMuted">
                    <p>Category: {resource.category || "-"}</p>
                    <p>Published: {formatDate(resource.publishedAt || resource.createdAt)}</p>
                    <p>File type: {fileKind(resource.file?.mimeType)}</p>
                    <p className="break-all">File: {resource.file?.originalName || "-"}</p>
                  </div>

                  {resource.file ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <a
                        href={getFilePreviewUrl(resource.file.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-2 border border-woreda-primary bg-woreda-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-woreda-sidebar"
                      >
                        <ExternalLink size={13} />
                        View
                      </a>

                      <a
                        href={getFileDownloadUrl(resource.file.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-2 border border-woreda-primary bg-woreda-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-woreda-sidebar"
                      >
                        <Download size={13} />
                        Download
                      </a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card border border-woreda-border bg-woreda-surface px-5 py-4">
      <p className="stat-label">
        {label}
      </p>
      <p className="stat-value mt-2 text-woreda-text">{value}</p>
    </div>
  );
}
