import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarClock,
  Eye,
  ImagePlus,
  Link as LinkIcon,
  Monitor,
  Paperclip,
  Save,
  Settings2,
  Smartphone,
  Upload,
  Video,
  X,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  createBroadcast,
  getBroadcast,
  updateBroadcast,
  uploadBroadcastFile,
} from "../../../services/contentService";
import type { FileInfo } from "../../../services/contentService";
import {
  escapeHtml,
  extractCoverMarker,
  fileInlineUrl,
  makeCoverMarker,
  removeCoverMarkers,
  rewriteBodyFileUrls,
} from "../../shared/content/broadcastUtils";
import { useAuthStore } from "../../../stores/authStore";

export function BroadcastEditorPage() {
  const { t } = useTranslation();
  const { hasPrivilege } = useAuthStore();
  const navigate = useNavigate();
  const { broadcastId } = useParams();
  const isEditMode = Boolean(broadcastId);
  const canSave = isEditMode ? hasPrivilege("broadcast.update") : hasPrivilege("broadcast.create");

  const [title, setTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["HIBRET_ADMIN", "MEMBER"]);
  const [coverFileId, setCoverFileId] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [inlineImageUrl, setInlineImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaLink, setMediaLink] = useState("");
  const [mediaLinkLabel, setMediaLinkLabel] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--aw-primary)] underline underline-offset-4" },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class:
            "my-5 rounded-3xl border border-[var(--aw-border-soft)] shadow-sm",
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      Placeholder.configure({
        placeholder: t("broadcasts.editor.placeholder"),
      }),
    ],
    content: "",
    onUpdate({ editor }) {
      setBodyHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "aw-article-editor min-h-[var(--aw-editor-min-h)] max-w-none bg-[var(--aw-surface)] px-4 py-4 text-[var(--aw-text)] outline-none focus:outline-none sm:px-6 sm:py-5",
      },
      handleDrop(_view, event) {
        const file = event.dataTransfer?.files?.[0];

        if (file && file.type.startsWith("image/")) {
          event.preventDefault();
          void insertUploadedImage(file);
          return true;
        }

        return false;
      },
    },
  });

  async function loadBroadcast() {
    if (!broadcastId || !editor) return;

    setError("");

    try {
      const data = await getBroadcast(broadcastId);
      const remoteCover = extractCoverMarker(data.bodyHtml);
      const cleanBody = removeCoverMarkers(data.bodyHtml || "");

      setTitle(data.title);
      setSummaryText(data.summary || "");
      setTargetRoles(data.targetRoles || ["HIBRET_ADMIN", "MEMBER"]);
      setCoverFileId(data.coverFileId || null);
      setCoverFileName(data.coverFileId ? "Uploaded main photo" : "");
      setCoverUrl(remoteCover);
      setUploadedFiles(data.attachments.map((item) => item.file));
      setBodyHtml(cleanBody);
      editor.commands.setContent(cleanBody);
    } catch {
      setError(t("broadcasts.editor.errors.load"));
    }
  }

  useEffect(() => {
    if (editor && broadcastId) {
      void loadBroadcast();
    }
  }, [editor, broadcastId]);

  const previewHtml = useMemo(() => rewriteBodyFileUrls(bodyHtml), [bodyHtml]);
  const heroImageUrl = coverFileId ? fileInlineUrl(coverFileId) : coverUrl;

  function toggleAudience(role: "HIBRET_ADMIN" | "MEMBER", checked: boolean) {
    setTargetRoles((current) =>
      checked
        ? [...new Set([...current, role])]
        : current.filter((item) => item !== role),
    );
  }

  async function uploadFile(
    file?: File,
    purpose: "cover" | "attachment" | "inlineImage" = "attachment",
  ) {
    if (!file) return null;
    if (!canSave) {
      setError(t("broadcasts.editor.errors.unauthorizedSave"));
      return null;
    }

    setIsUploading(true);
    setError("");
    setMessage("");

    try {
      const uploaded = await uploadBroadcastFile(file);

      setUploadedFiles((current) =>
        current.some((item) => item.id === uploaded.id)
          ? current
          : [...current, uploaded],
      );

      if (purpose === "cover") {
        setCoverFileId(uploaded.id);
        setCoverUrl("");
        setCoverFileName(uploaded.originalName);
      }

      setMessage(t("broadcasts.editor.messages.uploaded", { name: uploaded.originalName }));
      return uploaded;
    } catch (err: any) {
      setError(err?.response?.data?.message || t("broadcasts.editor.errors.upload"));
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function insertUploadedImage(file?: File) {
    if (!file || !editor) return;

    const uploaded = await uploadFile(file, "inlineImage");
    if (!uploaded) return;

    editor
      .chain()
      .focus()
      .setImage({
        src: fileInlineUrl(uploaded.id),
        alt: uploaded.originalName,
      })
      .run();
  }

  function setMainPhotoLink() {
    if (!coverUrl.trim()) return;

    const url = coverUrl.trim();

    if (!/^https?:\/\//i.test(url)) {
      setError(t("broadcasts.editor.errors.coverUrlProtocol"));
      return;
    }

    setCoverFileId(null);
    setCoverFileName("");
    setCoverUrl(url);
    setMessage(t("broadcasts.editor.messages.coverUrlSaved"));
  }

  function insertInlineImageLink() {
    if (!inlineImageUrl.trim() || !editor) return;

    const url = inlineImageUrl.trim();

    if (!/^https?:\/\//i.test(url)) {
      setError(t("broadcasts.editor.errors.inlineImageProtocol"));
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(`<figure><img src="${escapeHtml(url)}" alt="Broadcast image" /></figure>`)
      .run();

    setInlineImageUrl("");
  }

  function insertVideoLink() {
    if (!videoUrl.trim() || !editor) return;

    editor.commands.setYoutubeVideo({
      src: videoUrl.trim(),
      width: 640,
      height: 360,
    });

    setVideoUrl("");
  }

  function insertMediaLink() {
    if (!mediaLink.trim() || !editor) return;

    const label = mediaLinkLabel.trim() || mediaLink.trim();

    editor
      .chain()
      .focus()
      .insertContent(
        `<p><a href="${escapeHtml(mediaLink.trim())}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`,
      )
      .run();

    setMediaLink("");
    setMediaLinkLabel("");
  }

  async function saveBroadcast() {
    if (!editor) return;
    if (!canSave) {
      setError(t("broadcasts.editor.errors.unauthorizedSave"));
      return;
    }

    setError("");
    setMessage("");

    if (!title.trim()) {
      setError(t("broadcasts.editor.errors.titleRequired"));
      return;
    }

    if (targetRoles.length === 0) {
      setError(t("broadcasts.editor.errors.audienceRequired"));
      return;
    }

    const cleanBody = editor.getHTML();
    const bodyForSave = coverUrl.trim()
      ? `${makeCoverMarker(coverUrl.trim())}${cleanBody}`
      : cleanBody;

    const payload = {
      title: title.trim(),
      summary: summaryText.trim(),
      bodyHtml: bodyForSave,
      targetRoles,
      fileIds: uploadedFiles.map((file) => file.id),
      coverFileId,
    };

    try {
      if (isEditMode && broadcastId) {
        await updateBroadcast(broadcastId, payload);
        setMessage(t("broadcasts.editor.messages.updated"));
      } else {
        const created = await createBroadcast(payload);
        setMessage(t("broadcasts.editor.messages.created"));
        navigate(`/woreda/broadcasts/${created.id}/edit`, { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t("broadcasts.editor.errors.save"));
    }
  }

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-4 overflow-visible md:overflow-hidden">
      {error ? (
        <div className="shrink-0 rounded-2xl border border-[var(--aw-danger)]/25 bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-bold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="shrink-0 rounded-2xl border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--aw-primary)]">
          {message}
        </div>
      ) : null}

      <header className="shrink-0 overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[var(--aw-primary)] via-[var(--aw-yellow)] to-[var(--aw-magenta)]" />

        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)]">
              {t("broadcasts.editor.eyebrow")}
            </p>
            <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,2rem)] font-black tracking-tight text-[var(--aw-text)]">
              {isEditMode ? t("broadcasts.editor.editTitle") : t("broadcasts.editor.createTitle")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--aw-muted)]">
              {t("broadcasts.editor.subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/woreda/broadcasts"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-2 text-sm font-black text-[var(--aw-text)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              <ArrowLeft size={16} />
              {t("common.previous")}
            </Link>

            <button
              type="button"
              onClick={() => setIsSettingsOpen((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-2 text-sm font-black text-[var(--aw-text)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              {isSettingsOpen ? <X size={16} /> : <Settings2 size={16} />}
              {isSettingsOpen ? t("broadcasts.editor.actions.hideSettings") : t("broadcasts.editor.actions.showSettings")}
            </button>

            <button
              type="button"
              onClick={saveBroadcast}
              disabled={isUploading || !canSave}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary)] px-4 py-2 text-sm font-black text-white shadow-sm shadow-[var(--aw-primary)]/20 transition hover:-translate-y-0.5 hover:bg-[var(--aw-primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isUploading ? t("common.saving") : t("broadcasts.editor.actions.save")}
            </button>
          </div>
        </div>
      </header>

      <div
        className={[
          "grid min-h-0 flex-1 gap-4 overflow-visible md:overflow-hidden",
          isSettingsOpen
            ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)_minmax(19rem,0.52fr)]"
            : "xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]",
        ].join(" ")}
      >
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
          <div className="shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-3 sm:px-5">
            <h2 className="font-black text-[var(--aw-text)]">{t("broadcasts.editor.content.title")}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--aw-muted)]">
              {t("broadcasts.editor.content.subtitle")}
            </p>
          </div>

          <div className="shrink-0 space-y-3 border-b border-[var(--aw-border-soft)] p-4 sm:p-5">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("broadcasts.editor.content.titlePlaceholder")}
              className="min-h-12 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 text-lg font-black text-[var(--aw-text)] outline-none transition placeholder:text-[var(--aw-muted)] focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
            />

            <textarea
              value={summaryText}
              onChange={(event) => setSummaryText(event.target.value)}
              placeholder={t("broadcasts.editor.content.summaryPlaceholder")}
              className="min-h-24 w-full resize-y rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-3 text-sm font-semibold text-[var(--aw-text)] outline-none transition placeholder:text-[var(--aw-muted)] focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-3 sm:px-5">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]">{t("broadcasts.editor.toolbar.bold")}</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]">{t("broadcasts.editor.toolbar.italic")}</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]">{t("broadcasts.editor.toolbar.heading")}</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-1.5 text-xs font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]">{t("broadcasts.editor.toolbar.list")}</button>

            <label className={["inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--aw-primary)] transition hover:bg-[var(--aw-primary)] hover:text-white", !canSave ? "pointer-events-none opacity-60" : ""].join(" ")}>
              <ImagePlus size={13} />
              {t("broadcasts.editor.toolbar.addImage")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={!canSave}
                onChange={(event) => {
                  void insertUploadedImage(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            <div className="min-h-full overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
          <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--aw-text)]">
              <Eye size={16} className="text-[var(--aw-primary)]" />
              {t("broadcasts.editor.preview.title")}
            </div>

            <div className="flex w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={[
                  "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl px-3 text-xs font-black transition sm:flex-none",
                  previewMode === "desktop"
                    ? "bg-[var(--aw-primary)] text-white"
                    : "text-[var(--aw-muted)] hover:text-[var(--aw-primary)]",
                ].join(" ")}
              >
                <Monitor size={13} />
                {t("broadcasts.editor.preview.desktop")}
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={[
                  "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl px-3 text-xs font-black transition sm:flex-none",
                  previewMode === "mobile"
                    ? "bg-[var(--aw-primary)] text-white"
                    : "text-[var(--aw-muted)] hover:text-[var(--aw-primary)]",
                ].join(" ")}
              >
                <Smartphone size={13} />
                {t("broadcasts.editor.preview.mobile")}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-[var(--aw-bg)] p-3 sm:p-5">
            <article
              className={[
                "mx-auto overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm",
                previewMode === "mobile" ? "max-w-[min(24.375rem,100%)]" : "max-w-3xl",
              ].join(" ")}
            >
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={title || t("broadcasts.editor.preview.coverAlt")}
                  className="h-56 w-full object-cover sm:h-72"
                />
              ) : (
                <div className="flex h-56 w-full items-center justify-center bg-[var(--aw-primary-soft)] sm:h-72">
                  <ImagePlus size={36} className="text-[var(--aw-primary)]" />
                </div>
              )}

              <div className="p-5 sm:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--aw-primary)]">
                  {t("broadcasts.editor.preview.eyebrow")}
                </p>

                <h1 className="mt-2 text-[clamp(1.55rem,3vw,2.35rem)] font-black leading-tight tracking-tight text-[var(--aw-text)]">
                  {title || t("broadcasts.editor.preview.titleFallback")}
                </h1>

                <p className="mt-3 text-base font-semibold leading-7 text-[var(--aw-muted)]">
                  {summaryText || t("broadcasts.editor.preview.summaryFallback")}
                </p>

                <div
                  className="aw-article-preview mt-6 max-w-none text-[var(--aw-text)]"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </article>
          </div>
        </section>

        {isSettingsOpen ? (
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
            <div className="shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-[var(--aw-primary)]" />
                <h3 className="font-black text-[var(--aw-text)]">{t("broadcasts.editor.settings.title")}</h3>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--aw-muted)]">
                {t("broadcasts.editor.settings.subtitle")}
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
              <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.audienceTitle")}
                </p>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-2 text-sm font-black text-[var(--aw-text)]">
                    <input
                      type="checkbox"
                      checked={targetRoles.includes("HIBRET_ADMIN")}
                      onChange={(event) => toggleAudience("HIBRET_ADMIN", event.target.checked)}
                      disabled={!canSave}
                    />
                    {t("resources.form.targetHibretAdmins")}
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-2 text-sm font-black text-[var(--aw-text)]">
                    <input
                      type="checkbox"
                      checked={targetRoles.includes("MEMBER")}
                      onChange={(event) => toggleAudience("MEMBER", event.target.checked)}
                      disabled={!canSave}
                    />
                    {t("resources.form.targetMembers")}
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.coverUploadTitle")}
                </p>

                <label className={["mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--aw-primary)]/45 bg-[var(--aw-surface)] px-3 py-4 text-center text-sm font-black text-[var(--aw-muted)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]", !canSave ? "pointer-events-none opacity-60" : ""].join(" ")}>
                  <ImagePlus size={22} />
                  {isUploading
                    ? t("resources.form.uploading")
                    : coverFileName || t("broadcasts.editor.settings.coverUploadAction")}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={!canSave}
                    onChange={(event) => {
                      void uploadFile(event.currentTarget.files?.[0], "cover");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </section>

              <section className="space-y-2 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.coverLinkTitle")}
                </p>

                <input
                  value={coverUrl}
                  onChange={(event) => {
                    setCoverFileId(null);
                    setCoverFileName("");
                    setCoverUrl(event.target.value);
                  }}
                  placeholder={t("broadcasts.editor.settings.coverLinkPlaceholder")}
                  className="min-h-10 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
                />

                <button
                  type="button"
                  onClick={setMainPhotoLink}
                  disabled={!canSave}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--aw-primary)] hover:bg-[var(--aw-primary)] hover:text-white"
                >
                  <ImagePlus size={13} />
                  {t("broadcasts.editor.settings.coverLinkAction")}
                </button>
              </section>

              <section className="space-y-2 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.inlineImageTitle")}
                </p>

                <input
                  value={inlineImageUrl}
                  onChange={(event) => setInlineImageUrl(event.target.value)}
                  placeholder={t("broadcasts.editor.settings.inlineImagePlaceholder")}
                  className="min-h-10 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
                />

                <button
                  type="button"
                  onClick={insertInlineImageLink}
                  disabled={!canSave}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--aw-primary)] hover:bg-[var(--aw-primary)] hover:text-white"
                >
                  <ImagePlus size={13} />
                  {t("broadcasts.editor.settings.inlineImageAction")}
                </button>
              </section>

              <section className="space-y-2 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.videoTitle")}
                </p>

                <input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder={t("broadcasts.editor.settings.videoPlaceholder")}
                  className="min-h-10 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
                />

                <button
                  type="button"
                  onClick={insertVideoLink}
                  disabled={!canSave}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--aw-primary)] hover:bg-[var(--aw-primary)] hover:text-white"
                >
                  <Video size={13} />
                  {t("broadcasts.editor.settings.videoAction")}
                </button>
              </section>

              <section className="space-y-2 rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.linkTitle")}
                </p>

                <input
                  value={mediaLinkLabel}
                  onChange={(event) => setMediaLinkLabel(event.target.value)}
                  placeholder={t("broadcasts.editor.settings.linkLabelPlaceholder")}
                  className="min-h-10 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
                />

                <input
                  value={mediaLink}
                  onChange={(event) => setMediaLink(event.target.value)}
                  placeholder={t("broadcasts.editor.settings.linkPlaceholder")}
                  className="min-h-10 w-full rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm font-semibold text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-4 focus:ring-[var(--aw-primary)]/10"
                />

                <button
                  type="button"
                  onClick={insertMediaLink}
                  disabled={!canSave}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-[var(--aw-primary)] bg-[var(--aw-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--aw-primary)] hover:bg-[var(--aw-primary)] hover:text-white"
                >
                  <LinkIcon size={13} />
                  {t("broadcasts.editor.settings.linkAction")}
                </button>
              </section>

              <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.attachmentsTitle")}
                </p>

                <label className={["mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--aw-primary)]/45 bg-[var(--aw-surface)] px-3 py-4 text-center text-sm font-black text-[var(--aw-muted)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]", !canSave ? "pointer-events-none opacity-60" : ""].join(" ")}>
                  <Upload size={22} />
                  {t("broadcasts.editor.settings.attachmentsAction")}
                  <input
                    type="file"
                    className="sr-only"
                    disabled={!canSave}
                    onChange={(event) => {
                      void uploadFile(event.currentTarget.files?.[0], "attachment");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </section>

              <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-primary-soft)] p-4">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--aw-primary)]">
                  <CalendarClock size={15} />
                  {t("broadcasts.editor.settings.publishingTitle")}
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.publishingHint")}
                </p>
              </section>

              <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">
                  {t("broadcasts.editor.settings.uploadedFilesTitle")}
                </p>

                <div className="mt-3 space-y-2">
                  {uploadedFiles.length === 0 ? (
                    <p className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-2 text-xs font-semibold text-[var(--aw-muted)]">
                      {t("broadcasts.editor.settings.uploadedFilesEmpty")}
                    </p>
                  ) : (
                    uploadedFiles.map((file) => (
                      <p
                        key={file.id}
                        className="break-all rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 py-2 text-xs font-semibold text-[var(--aw-muted)]"
                      >
                        {file.originalName}
                      </p>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
