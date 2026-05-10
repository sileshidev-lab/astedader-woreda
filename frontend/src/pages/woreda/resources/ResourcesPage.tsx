import { useEffect, useMemo, useState } from "react";
import { Archive, Download, Eye, FileText, Plus, Send, Upload } from "lucide-react";
import {
  archiveResource,
  createResource,
  getResources,
  publishResource,
  updateResource,
  uploadResourceFile,
} from "../../../services/contentService";
import type { ResourceItem } from "../../../services/contentService";
import {getAuthenticatedExportUrl, getFileDownloadUrl} from "../../../services/announcementService";
import { useAuthStore } from "../../../store/authStore";

function readableFileName(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "-";

  try {
    const repaired = decodeURIComponent(escape(text));
    if (repaired && !repaired.includes("�")) return repaired;
  } catch {
    // Keep original when browser cannot repair mojibake.
  }

  return text;
}

function statusClass(status: string) {
  if (status === "published") return "rounded border border-woreda-success/20 bg-woreda-successBg px-2.5 py-1 text-xs font-bold text-woreda-success";
  if (status === "archived") return "rounded border border-woreda-border bg-woreda-surfaceLow px-2.5 py-1 text-xs font-bold text-woreda-textMuted";
  return "rounded border border-woreda-primary/20 bg-woreda-primarySoft px-2.5 py-1 text-xs font-bold text-woreda-primary";
}


function openResourcePreview(fileId?: string | null) {
  if (!fileId) return;

  window.open(
    getFileDownloadUrl(fileId) + "&inline=true",
    "_blank",
    "noopener,noreferrer"
  );
}

export function ResourcesPage() {
  const { hasPrivilege } = useAuthStore();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, drafts: 0, archived: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [fileId, setFileId] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(["HIBRET_ADMIN", "MEMBER"]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManage = hasPrivilege("resource.create") || hasPrivilege("resource.update");

  async function loadResources() {
    setError("");
    try {
      const data = await getResources();
      setResources(data.resources);
      setSummary(data.summary);
    } catch {
      setError("Unable to load resources.");
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setFileId("");
    setFileName("");
    setTargetRoles(["HIBRET_ADMIN", "MEMBER"]);
    setIsFormOpen(true);
  }

  function openEdit(item: ResourceItem) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || "");
    setFileId(item.fileId || "");
    setFileName(item.file?.originalName || "");
    setTargetRoles(item.targetRoles);
    setIsFormOpen(true);
  }

  async function handleFile(file?: File) {
    if (!file) return;

    setIsUploadingFile(true);
    setError("");
    setMessage("");

    try {
      const uploaded = await uploadResourceFile(file);
      setFileId(uploaded.id);
      setFileName(readableFileName(uploaded.originalName));
      setMessage(`Selected file uploaded: ${readableFileName(uploaded.originalName)}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to upload selected file.");
      setFileId("");
      setFileName("");
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function saveResource() {
    setError("");
    setMessage("");

    const payload = {
      title,
      description,
      category,
      fileId: fileId || null,
      targetRoles,
    };

    try {
      if (editing) {
        await updateResource(editing.id, payload);
        setMessage("Resource updated.");
      } else {
        await createResource(payload);
        setMessage("Resource created.");
      }

      setIsFormOpen(false);
      await loadResources();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save resource.");
    }
  }

  const categories = useMemo(
    () => [...new Set(resources.map((item) => item.category).filter(Boolean))],
    [resources]
  );

  useEffect(() => {
    setPage(1);
  }, [resources.length]);

  const totalPages = Math.max(1, Math.ceil(resources.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedResources = resources.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="aw-design-page aw-design-resources aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-5">
      {error ? <div className="rounded border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">{error}</div> : null}
      {message ? <div className="rounded border border-woreda-primary/20 bg-woreda-primarySoft px-4 py-3 text-sm font-semibold text-woreda-primary">{message}</div> : null}

      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-4">
        <Metric label="Resources" value={summary.total} />
        <Metric label="Published" value={summary.published} tone="success" />
        <Metric label="Draft" value={summary.drafts} tone="primary" />
        <Metric label="Archived" value={summary.archived} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="flex shrink-0 flex-col gap-4 border-b border-woreda-border/60 bg-woreda-surfaceLow px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-sm font-semibold text-woreda-textMuted">
              {resources.length} resources
            </p>

          {canManage ? (
            <button onClick={openCreate} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar">
              <Plus size={16} />
              Create Resource
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {resources.length === 0 ? (
            <EmptyMessage message="No resources found." />
          ) : (
            <div className="form-grid">
              {paginatedResources.map((item) => (
                <article
                  key={item.id}
                  onClick={() => openResourcePreview(item.fileId)}
                  className={[
                    "rounded-2xl border border-woreda-border/70 bg-woreda-surfaceLow p-5 transition",
                    item.fileId
                      ? "cursor-pointer hover:border-woreda-primary hover:bg-woreda-primarySoft/30"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded border border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-woreda-text">{item.title}</h2>
                        <p className="mt-1 text-sm text-woreda-textMuted">{item.description || "No description recorded."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={statusClass(item.status)}>{item.status}</span>
                          {item.category ? <span className="rounded border border-woreda-border bg-woreda-surface px-2.5 py-1 text-xs font-bold text-woreda-textMuted">{item.category}</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {item.file ? (
                    <div className="mt-4 rounded border border-woreda-border/60 bg-woreda-surface px-4 py-3 text-sm font-semibold text-woreda-textMuted">
                      {readableFileName(item.file.originalName)}
                    </div>
                  ) : null}

                  <div
                    className="mt-4 flex flex-wrap justify-end gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {item.fileId ? (
                      <>
                        <a
                          href={getFileDownloadUrl(item.fileId) + "&inline=true"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-primary bg-woreda-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-woreda-sidebar"
                        >
                          <Eye size={13} />
                          View
                        </a>

                        <a
                          href={getAuthenticatedExportUrl(`/files/${item.fileId}/download`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-primary bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary"
                        >
                          <Download size={13} />
                          Download
                        </a>
                      </>
                    ) : null}

                    {canManage ? (
                      <button onClick={() => openEdit(item)} className="rounded-2xl border border-woreda-primary bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary">Edit</button>
                    ) : null}

                    {item.status !== "published" && hasPrivilege("resource.publish") ? (
                      <button onClick={async () => { await publishResource(item.id); await loadResources(); }} className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-success bg-woreda-successBg px-3 py-1.5 text-xs font-bold text-woreda-success">
                        <Send size={13} />
                        Publish
                      </button>
                    ) : null}

                    {item.status !== "archived" && hasPrivilege("resource.archive") ? (
                      <button onClick={async () => { await archiveResource(item.id); await loadResources(); }} className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-border bg-woreda-surface px-3 py-1.5 text-xs font-bold text-woreda-text">
                        <Archive size={13} />
                        Archive
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-woreda-border bg-woreda-surfaceLow px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-woreda-textMuted">
            Page {safePage} of {totalPages} · {resources.length} total
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <select
              className="aw-filter-select"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button type="button" className="aw-btn aw-btn-outline-strong" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button type="button" className="aw-btn aw-btn-outline-strong" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </button>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <div className="aw-resource-drawer fixed inset-0 z-50 flex justify-end bg-[var(--overlay-scrim)]">
          <div className="aw-resource-drawer-sheet flex h-full w-full max-w-xl flex-col rounded-l-3xl bg-woreda-surface shadow-none max-md:rounded-none">
            <div className="border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4">
              <h2 className="text-xl font-bold text-woreda-text">{editing ? "Edit Resource" : "Create Resource"}</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" className="min-h-11 w-full rounded border border-woreda-border bg-woreda-surface px-3 text-sm outline-none focus:border-woreda-primary" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="min-h-24 w-full rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary" />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" list="resource-categories" className="min-h-11 w-full rounded border border-woreda-border bg-woreda-surface px-3 text-sm outline-none focus:border-woreda-primary" />
              <datalist id="resource-categories">{categories.map((item) => <option key={item} value={item || ""} />)}</datalist>

              <div className="rounded border border-dashed border-woreda-border bg-woreda-surfaceLow p-3">
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
                  <Upload size={16} />
                  {isUploadingFile ? "Uploading selected file..." : fileName ? "Change file" : "Choose resource file"}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      void handleFile(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                <div className="mt-3 rounded border border-woreda-border/60 bg-woreda-surface px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                    Selected file
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-woreda-text">
                    {fileName || "No file selected yet."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 rounded border border-woreda-border bg-woreda-surfaceLow px-3 py-2 text-sm font-semibold">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={targetRoles.includes("HIBRET_ADMIN")} onChange={(e) => setTargetRoles((current) => e.target.checked ? [...new Set([...current, "HIBRET_ADMIN"])] : current.filter((role) => role !== "HIBRET_ADMIN"))} />
                  Hibret Admins
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={targetRoles.includes("MEMBER")} onChange={(e) => setTargetRoles((current) => e.target.checked ? [...new Set([...current, "MEMBER"])] : current.filter((role) => role !== "MEMBER"))} />
                  Members
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-woreda-border bg-woreda-surfaceLow px-5 py-4">
              <button onClick={() => setIsFormOpen(false)} className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold">Cancel</button>
              <button
                onClick={saveResource}
                disabled={isUploadingFile}
                className="min-h-10 rounded border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingFile ? "Uploading..." : "Save Resource"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "primary" | "success" }) {
  const toneClass =
    tone === "primary"
      ? { soft: "bg-[var(--aw-primary-soft)]", value: "text-[var(--aw-primary)]", bar: "bg-[var(--aw-primary)]" }
      : tone === "success"
        ? { soft: "bg-[var(--aw-success-bg)]", value: "text-[var(--aw-success)]", bar: "bg-[var(--aw-success)]" }
        : { soft: "bg-[var(--aw-surface-muted)]", value: "text-[var(--aw-text)]", bar: "bg-[var(--aw-muted)]" };
  return (
    <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${toneClass.soft}`} aria-hidden />
      <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">{label}</p>
      <p className={`relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none ${toneClass.value}`}>{value}</p>
      <div className={`relative mt-3 h-1.5 rounded-full ${toneClass.bar}`} />
    </article>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return <div className="rounded border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">{message}</div>;
}
