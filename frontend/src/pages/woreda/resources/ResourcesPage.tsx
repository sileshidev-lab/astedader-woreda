import { useEffect, useMemo, useState } from "react";
import { Archive, Download, Eye, FileText, Plus, Send, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  archiveResource,
  createResource,
  getResources,
  publishResource,
  updateResource,
  uploadResourceFile,
} from "../../../services/contentService";
import type { ResourceItem } from "../../../services/contentService";
import {
  getAuthenticatedExportUrl,
  getFileDownloadUrl,
} from "../../../services/announcementService";
import { useAuthStore } from "../../../stores/authStore";
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
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Label } from "@/components/ui/shadcn/label";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/shadcn/sheet";
import { statusToBadgeVariant } from "@/lib/badge";

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

function openResourcePreview(fileId?: string | null) {
  if (!fileId) return;

  window.open(
    getFileDownloadUrl(fileId) + "&inline=true",
    "_blank",
    "noopener,noreferrer",
  );
}

function Metric({ label, value }: { label: string; value: number }) {
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

export function ResourcesPage() {
  const { t } = useTranslation();
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

  const canManage = hasPrivilege("resource.create") || hasPrivilege("resource.update");

  async function loadResources() {
    try {
      const data = await getResources();
      setResources(data.resources);
      setSummary(data.summary);
    } catch {
      toast.error(t("resources.errors.load"));
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

    try {
      const uploaded = await uploadResourceFile(file);
      setFileId(uploaded.id);
      setFileName(readableFileName(uploaded.originalName));
      toast.success(
        t("resources.messages.fileUploaded", {
          name: readableFileName(uploaded.originalName),
        }),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("resources.errors.upload"));
      setFileId("");
      setFileName("");
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function saveResource() {
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
        toast.success(t("resources.messages.updated"));
      } else {
        await createResource(payload);
        toast.success(t("resources.messages.created"));
      }

      setIsFormOpen(false);
      await loadResources();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("resources.errors.save"));
    }
  }

  const categories = useMemo(
    () => [...new Set(resources.map((item) => item.category).filter(Boolean))],
    [resources],
  );

  useEffect(() => {
    setPage(1);
  }, [resources.length]);

  const totalPages = Math.max(1, Math.ceil(resources.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedResources = resources.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-4">
        <Metric label={t("resources.kpi.total")} value={summary.total} />
        <Metric label={t("resources.kpi.published")} value={summary.published} />
        <Metric label={t("resources.kpi.draft")} value={summary.drafts} />
        <Metric label={t("resources.kpi.archived")} value={summary.archived} />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="flex shrink-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("sidebar.resources", { defaultValue: "Resources" })}</CardTitle>
            <CardDescription>
              {t("resources.countLine", { count: resources.length })}
            </CardDescription>
          </div>

          {canManage ? (
            <Button type="button" variant="default" size="default" onClick={openCreate}>
              <Plus aria-hidden />
              {t("resources.actions.create")}
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {resources.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              {t("resources.empty")}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedResources.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => openResourcePreview(item.fileId)}
                  className={item.fileId ? "cursor-pointer transition-colors hover:border-primary/50" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        <FileText size={18} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate">{item.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {item.description || t("resources.noDescription")}
                        </CardDescription>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={statusToBadgeVariant(item.status)}>{item.status}</Badge>
                          {item.category ? (
                            <Badge variant="muted">{item.category}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.file ? (
                      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        {readableFileName(item.file.originalName)}
                      </div>
                    ) : null}

                    <div
                      className="flex flex-wrap justify-end gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {item.fileId ? (
                        <>
                          <Button asChild variant="default" size="sm">
                            <a
                              href={getFileDownloadUrl(item.fileId) + "&inline=true"}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Eye aria-hidden />
                              {t("common.open")}
                            </a>
                          </Button>

                          <Button asChild variant="outline" size="sm">
                            <a
                              href={getAuthenticatedExportUrl(`/files/${item.fileId}/download`)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download aria-hidden />
                              {t("resources.actions.download")}
                            </a>
                          </Button>
                        </>
                      ) : null}

                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          {t("common.edit")}
                        </Button>
                      ) : null}

                      {item.status !== "published" && hasPrivilege("resource.publish") ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await publishResource(item.id);
                            await loadResources();
                          }}
                        >
                          <Send aria-hidden />
                          {t("common.publish")}
                        </Button>
                      ) : null}

                      {item.status !== "archived" && hasPrivilege("resource.archive") ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await archiveResource(item.id);
                            await loadResources();
                          }}
                        >
                          <Archive aria-hidden />
                          {t("common.archive")}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("common.paginationLine", {
              page: safePage,
              pages: totalPages,
              total: resources.length,
            })}
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-auto px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t("common.pageSize", { size: 10 })}</SelectItem>
                <SelectItem value="20">{t("common.pageSize", { size: 20 })}</SelectItem>
                <SelectItem value="50">{t("common.pageSize", { size: 50 })}</SelectItem>
                <SelectItem value="100">{t("common.pageSize", { size: 100 })}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("common.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]"
        >
          <SheetHeader className="border-b border-border bg-muted/30">
            <SheetTitle>
              {editing ? t("resources.form.editTitle") : t("resources.form.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing ? t("resources.form.editTitle") : t("resources.form.createTitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-title">{t("resources.form.titlePlaceholder")}</Label>
              <Input
                id="resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("resources.form.titlePlaceholder")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-description">
                {t("resources.form.descriptionPlaceholder")}
              </Label>
              <Textarea
                id="resource-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("resources.form.descriptionPlaceholder")}
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category">
                {t("resources.form.categoryPlaceholder")}
              </Label>
              <Input
                id="resource-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("resources.form.categoryPlaceholder")}
                list="resource-categories"
              />
              <datalist id="resource-categories">
                {categories.map((item) => (
                  <option key={item} value={item || ""} />
                ))}
              </datalist>
            </div>

            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary">
                <Upload size={16} aria-hidden />
                {isUploadingFile
                  ? t("resources.form.uploadingSelected")
                  : fileName
                    ? t("resources.form.changeFile")
                    : t("resources.form.chooseFile")}
                <input
                  type="file"
                  className="sr-only"
                  onChange={(event) => {
                    void handleFile(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <div className="mt-3 rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {t("resources.form.selectedFile")}
                </p>
                <p className="mt-1 break-all text-sm text-foreground">
                  {fileName || t("resources.form.noFile")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={targetRoles.includes("HIBRET_ADMIN")}
                  onCheckedChange={(checked) =>
                    setTargetRoles((current) =>
                      checked
                        ? [...new Set([...current, "HIBRET_ADMIN"])]
                        : current.filter((role) => role !== "HIBRET_ADMIN"),
                    )
                  }
                />
                {t("resources.form.targetHibretAdmins")}
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={targetRoles.includes("MEMBER")}
                  onCheckedChange={(checked) =>
                    setTargetRoles((current) =>
                      checked
                        ? [...new Set([...current, "MEMBER"])]
                        : current.filter((role) => role !== "MEMBER"),
                    )
                  }
                />
                {t("resources.form.targetMembers")}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsFormOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="default"
              size="default"
              onClick={saveResource}
              disabled={isUploadingFile}
            >
              {isUploadingFile ? t("resources.form.uploading") : t("resources.actions.save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
