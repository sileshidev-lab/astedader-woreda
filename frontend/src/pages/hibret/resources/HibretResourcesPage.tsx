import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileText, Search } from "lucide-react";
import { getHibretResources } from "../../../services/hibretPortalService";
import type { ResourceItem } from "../../../services/contentService";
import { getFileDownloadUrl } from "../../../services/announcementService";
import {
  AdminMetricCard,
  AdminSectionPanel,
  AdminStatusPill,
  AdminEmptyState,
} from "../../../components/ui/AdminPagePrimitives";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function HibretResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
        <div className="rounded border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">{error}</div>
      ) : null}

      <div className="stat-grid shrink-0">
        <AdminMetricCard label="Available resources" value={resources.length} note="Published files for Hibret work" />
        <AdminMetricCard label="Categories" value={categories.length} note="Library groupings" />
        <AdminMetricCard label="Matching results" value={filteredResources.length} note="Filtered for your current search" tone="success" />
      </div>

      <AdminSectionPanel
        title="Resource Library"
        description="Published operational documents and references for Hibret administration."
        actions={
          <div className="aw-toolbar aw-toolbar-mobile-controls mt-0">
          <div className="flex min-h-10 border border-woreda-border bg-woreda-surface">
            <span className="flex items-center px-3 text-woreda-textMuted"><Search size={15} /></span>
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search resources" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
          </div>
          <button
            type="button"
            className="aw-btn aw-btn-outline aw-mobile-filters-toggle md:hidden"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="hibret-resources-mobile-filters"
          >
            Filters
            {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <div
            id="hibret-resources-mobile-filters"
            className={[
              "aw-toolbar-filter-group",
              mobileFiltersOpen ? "aw-toolbar-filter-group-open" : "",
            ].join(" ")}
          >
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="aw-filter-select">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category || ""}>{category}</option>)}
            </select>

            <button type="button" onClick={() => { setSearchText(""); setCategoryFilter(""); }} className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
              Clear
            </button>
          </div>
          </div>
        }
      >

      <div className="min-h-0 flex-1 overflow-auto">
        {filteredResources.length === 0 ? (
          <AdminEmptyState title="No published resources found" description="Try a different category or search query." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredResources.map((resource) => (
              <article key={resource.id} className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary">
                    <FileText size={22} />
                  </div>
                  <AdminStatusPill label="Published" tone="success" />
                </div>

                <h2 className="mt-4 line-clamp-2 text-xl font-black text-woreda-text">{resource.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-woreda-textMuted">{resource.description || "No description recorded."}</p>

                <div className="mt-4 space-y-1 text-xs font-semibold text-woreda-textMuted">
                  <p>Category: {resource.category || "-"}</p>
                  <p>Published: {formatDate(resource.publishedAt || resource.createdAt)}</p>
                  <p className="break-all">File: {resource.file?.originalName || "-"}</p>
                </div>

                {resource.file ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a href={getFileDownloadUrl(resource.file.id) + "&inline=true"} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-primary bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary">
                      <ExternalLink size={13} />
                      View
                    </a>
                    <a href={getFileDownloadUrl(resource.file.id)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-border bg-woreda-surface px-3 py-1.5 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
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
      </AdminSectionPanel>
    </section>
  );
}
