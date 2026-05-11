import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ImageIcon, X } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { getApiBaseUrl } from "../../../services/runtimeConfig";
import type {
  MemberFormOptions,
  MemberPayload,
  WoredaMember,
} from "../../../services/woredaMemberService";

type MemberFormDrawerProps = {
  title: string;
  isOpen: boolean;
  member?: WoredaMember | null;
  options: MemberFormOptions;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: MemberPayload) => Promise<void>;
};

const emptyForm: MemberPayload = {
  memberCode: "",
  fanId: "",
  ppId: "",
  firstName: "",
  fatherName: "",
  grandfatherName: "",
  gender: "ወንድ",
  dateOfBirth: "",
  phone: "",
  email: "",
  hibretId: "",
  familyId: "",
  membershipStatus: "ዕጩ አባል",
  registrationType: "እንደ አዲስ የተመዘገበ",
  membershipYear: null,
  partyRole: "",
  educationLevel: "",
  fieldOfStudy: "",
  workplace: "",
  workType: "የመንግስት ሰራተኛ",
  workExperienceYears: null,
  zone: "",
  kebele: "",
  ethnicity: "",
  healthStatus: "ጤነኛ",
  photoFileId: "",
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function nullIfEmpty(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function intOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fileUrl(fileId?: string | null) {
  if (!fileId) return "";

  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("astedader_woreda_token");
  const query = token ? `?token=${encodeURIComponent(token)}&inline=true` : "?inline=true";

  return `${baseUrl}/files/${fileId}/download${query}`;
}

async function uploadMemberPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: { id: string } }>("/files/upload/member", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.file.id;
}

export function MemberFormDrawer({
  title,
  isOpen,
  member,
  options,
  isSaving,
  onClose,
  onSubmit,
}: MemberFormDrawerProps) {
  const [form, setForm] = useState<MemberPayload>(emptyForm);
  const [error, setError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (member) {
      setForm({
        memberCode: member.memberCode ?? "",
        fanId: member.fanId ?? "",
        ppId: member.ppId ?? "",
        firstName: member.firstName ?? "",
        fatherName: member.fatherName ?? "",
        grandfatherName: member.grandfatherName ?? "",
        gender: member.gender ?? "ወንድ",
        dateOfBirth: toDateInput(member.dateOfBirth),
        phone: member.phone ?? "",
        email: member.email ?? "",
        hibretId: member.hibretId ?? "",
        familyId: member.familyId ?? "",
        membershipStatus: member.membershipStatus ?? "ዕጩ አባል",
        registrationType: member.registrationType ?? "እንደ አዲስ የተመዘገበ",
        membershipYear: member.membershipYear ?? null,
        partyRole: member.partyRole ?? "",
        educationLevel: member.educationLevel ?? "",
        fieldOfStudy: member.fieldOfStudy ?? "",
        workplace: member.workplace ?? "",
        workType: member.workType ?? "የመንግስት ሰራተኛ",
        workExperienceYears: member.workExperienceYears ?? null,
        zone: member.zone ?? "",
        kebele: member.kebele ?? "",
        ethnicity: member.ethnicity ?? "",
        healthStatus: member.healthStatus ?? "ጤነኛ",
        photoFileId: member.photoFileId ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        hibretId: options.hibrets[0]?.id ?? "",
      });
    }

    setError("");
  }, [isOpen, member, options.hibrets]);

  const familiesForHibret = useMemo(() => {
    return options.families.filter((family) => family.hibretId === form.hibretId);
  }, [form.hibretId, options.families]);

  if (!isOpen) return null;

  function updateField(name: keyof MemberPayload, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "hibretId" ? { familyId: "" } : {}),
    }));
  }

  async function handlePhotoChange(file?: File | null) {
    if (!file) return;

    setPhotoUploading(true);
    setError("");

    try {
      const fileId = await uploadMemberPhoto(file);
      updateField("photoFileId", fileId);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to upload member photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!String(form.firstName || "").trim() || !String(form.fatherName || "").trim() || !form.gender || !form.hibretId) {
      setError("First name, father name, gender, and Hibret are required.");
      return;
    }

    await onSubmit({
      memberCode: nullIfEmpty(form.memberCode),
      fanId: nullIfEmpty(form.fanId),
      ppId: nullIfEmpty(form.ppId),
      firstName: String(form.firstName).trim(),
      fatherName: String(form.fatherName).trim(),
      grandfatherName: nullIfEmpty(form.grandfatherName),
      gender: String(form.gender || "ወንድ"),
      dateOfBirth: nullIfEmpty(form.dateOfBirth),
      phone: nullIfEmpty(form.phone),
      email: nullIfEmpty(form.email),
      hibretId: String(form.hibretId || ""),
      familyId: nullIfEmpty(form.familyId),
      membershipStatus: nullIfEmpty(form.membershipStatus),
      registrationType: nullIfEmpty(form.registrationType),
      membershipYear: intOrNull(form.membershipYear),
      partyRole: nullIfEmpty(form.partyRole),
      educationLevel: nullIfEmpty(form.educationLevel),
      fieldOfStudy: nullIfEmpty(form.fieldOfStudy),
      workplace: nullIfEmpty(form.workplace),
      workType: nullIfEmpty(form.workType),
      workExperienceYears: intOrNull(form.workExperienceYears),
      zone: nullIfEmpty(form.zone),
      kebele: nullIfEmpty(form.kebele),
      ethnicity: nullIfEmpty(form.ethnicity),
      healthStatus: nullIfEmpty(form.healthStatus),
      photoFileId: nullIfEmpty(form.photoFileId),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay-scrim)]" onMouseDown={onClose}>
      <aside
        className="flex min-h-0 h-full w-full max-w-4xl flex-col bg-woreda-surface text-woreda-text shadow-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-woreda-border bg-woreda-surfaceLow px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
                Members
              </p>
              <h2 className="mt-1 text-xl font-bold text-woreda-text">{title}</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center border border-woreda-border bg-woreda-surface text-woreda-text"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-bold text-woreda-danger">
              {error}
            </div>
          ) : null}

          <div className="mb-5 border border-woreda-border bg-woreda-surfaceLow p-4">
            <p className="mb-3 text-sm font-bold text-woreda-text">Member photo</p>
            <div className="flex items-center gap-4">
              <div className="member-photo-upload-preview">
                {form.photoFileId ? (
                  <img src={fileUrl(form.photoFileId)} alt="Member photo" />
                ) : (
                  <ImageIcon size={26} />
                )}
              </div>

              <div className="min-w-0">
                <input
                  type="file"
                  accept="image/*"
                  disabled={photoUploading || isSaving}
                  onChange={(event) => void handlePhotoChange(event.currentTarget.files?.[0])}
                />
                <p className="mt-2 text-xs font-semibold text-woreda-textMuted">
                  {photoUploading ? "Uploading photo..." : "Upload or replace the member profile photo."}
                </p>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <FormInput label="PP" value={String(form.ppId ?? "")} onChange={(value) => updateField("ppId", value)} placeholder="PP/00000000" />
            <FormInput label="FAN" value={String(form.fanId ?? "")} onChange={(value) => updateField("fanId", value)} placeholder="0000 0000 0000 0000" />
            <FormInput label="Member Code" value={String(form.memberCode ?? "")} onChange={(value) => updateField("memberCode", value)} placeholder="Member code" />

            <label className="member-form-field">
              Gender
              <select value={String(form.gender ?? "")} onChange={(event) => updateField("gender", event.target.value)}>
                <option value="ወንድ">ወንድ</option>
                <option value="ሴት">ሴት</option>
                <option value="male">male</option>
                <option value="female">female</option>
              </select>
            </label>

            <FormInput label="First Name" value={String(form.firstName ?? "")} onChange={(value) => updateField("firstName", value)} required />
            <FormInput label="Father Name" value={String(form.fatherName ?? "")} onChange={(value) => updateField("fatherName", value)} required />
            <FormInput label="Grandfather Name" value={String(form.grandfatherName ?? "")} onChange={(value) => updateField("grandfatherName", value)} />

            <label className="member-form-field">
              Hibret
              <select value={String(form.hibretId ?? "")} onChange={(event) => updateField("hibretId", event.target.value)} required>
                <option value="">Select Hibret</option>
                {options.hibrets.map((hibret) => (
                  <option value={hibret.id} key={hibret.id}>{hibret.name}</option>
                ))}
              </select>
            </label>

            <label className="member-form-field">
              Family
              <select value={String(form.familyId ?? "")} onChange={(event) => updateField("familyId", event.target.value)}>
                <option value="">Unassigned</option>
                {familiesForHibret.map((family) => (
                  <option value={family.id} key={family.id}>{family.name}</option>
                ))}
              </select>
            </label>

            <FormInput label="Date of Birth" type="date" value={String(form.dateOfBirth ?? "")} onChange={(value) => updateField("dateOfBirth", value)} />
            <FormInput label="Phone" value={String(form.phone ?? "")} onChange={(value) => updateField("phone", value)} />
            <FormInput label="Email" type="email" value={String(form.email ?? "")} onChange={(value) => updateField("email", value)} />
            <FormInput label="Membership Year" type="number" value={String(form.membershipYear ?? "")} onChange={(value) => updateField("membershipYear", value)} />
            <FormInput label="Party Role" value={String(form.partyRole ?? "")} onChange={(value) => updateField("partyRole", value)} />
            <FormInput label="Education Level" value={String(form.educationLevel ?? "")} onChange={(value) => updateField("educationLevel", value)} />
            <FormInput label="Field of Study" value={String(form.fieldOfStudy ?? "")} onChange={(value) => updateField("fieldOfStudy", value)} />
            <FormInput label="Workplace" value={String(form.workplace ?? "")} onChange={(value) => updateField("workplace", value)} />
            <FormInput label="Work Type" value={String(form.workType ?? "")} onChange={(value) => updateField("workType", value)} />
            <FormInput label="Work Experience Years" type="number" value={String(form.workExperienceYears ?? "")} onChange={(value) => updateField("workExperienceYears", value)} />
            <FormInput label="Zone" value={String(form.zone ?? "")} onChange={(value) => updateField("zone", value)} />
            <FormInput label="Kebele" value={String(form.kebele ?? "")} onChange={(value) => updateField("kebele", value)} />
            <FormInput label="Ethnicity" value={String(form.ethnicity ?? "")} onChange={(value) => updateField("ethnicity", value)} />
            <FormInput label="Health Status" value={String(form.healthStatus ?? "")} onChange={(value) => updateField("healthStatus", value)} />
            <FormInput label="Registration Type" value={String(form.registrationType ?? "")} onChange={(value) => updateField("registrationType", value)} />
            <FormInput label="Membership Status" value={String(form.membershipStatus ?? "")} onChange={(value) => updateField("membershipStatus", value)} />
          </div>

          <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-woreda-border bg-woreda-surface py-4">
            <button
              type="button"
              className="aw-secondary-button"
              onClick={onClose}
              disabled={isSaving || photoUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="aw-primary-button"
              disabled={isSaving || photoUploading}
            >
              {isSaving ? "Saving..." : "Save Member"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="member-form-field">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default MemberFormDrawer;
