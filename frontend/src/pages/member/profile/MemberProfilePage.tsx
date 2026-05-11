import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Edit3,
  GraduationCap,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import {
  getMyMemberProfile,
  updateMyMemberProfile,
} from "../../../services/woredaMemberService";
import type {
  MyMemberProfileUpdatePayload,
  WoredaMember,
} from "../../../services/woredaMemberService";

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function inputValue(value: unknown) {
  if (value === null || value === undefined || value === "-") return "";
  if (typeof value === "string" && value.includes("T")) return value.slice(0, 10);
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function profileInitials(member?: WoredaMember | null) {
  if (!member) return "MB";
  return [member.firstName, member.fatherName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isMissing(value: unknown) {
  return value === null || value === undefined || value === "" || value === "-";
}

function makeEditForm(member: WoredaMember | null): MyMemberProfileUpdatePayload {
  return {
    firstName: inputValue(member?.firstName),
    fatherName: inputValue(member?.fatherName),
    grandfatherName: inputValue(member?.grandfatherName),
    gender: inputValue(member?.gender),
    phone: inputValue(member?.phone),
    email: inputValue(member?.email),
    dateOfBirth: inputValue(member?.dateOfBirth),
    registrationType: inputValue(member?.registrationType),
    membershipYear: inputValue(member?.membershipYear),
    partyRole: inputValue(member?.partyRole),
    educationLevel: inputValue(member?.educationLevel),
    fieldOfStudy: inputValue(member?.fieldOfStudy),
    workplace: inputValue(member?.workplace),
    workType: inputValue(member?.workType),
    workExperienceYears: inputValue(member?.workExperienceYears),
    zone: inputValue(member?.zone),
    kebele: inputValue(member?.kebele),
    ethnicity: inputValue(member?.ethnicity),
    healthStatus: inputValue(member?.healthStatus),
  };
}

export function MemberProfilePage() {
  const { user } = useAuthStore();
  const [member, setMember] = useState<WoredaMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<MyMemberProfileUpdatePayload>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProfile() {
    setIsLoading(true);
    setError("");

    try {
      const data = await getMyMemberProfile();
      setMember(data);
      setEditForm(makeEditForm(data));
    } catch {
      setError("Unable to load your member profile.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const fullName = useMemo(() => {
    if (!member) return "Member Profile";
    return [member.firstName, member.fatherName, member.grandfatherName].filter(Boolean).join(" ");
  }, [member]);

  const profileCompletion = member?.profileCompletion ?? 0;

  const missingFields = useMemo(() => {
    if (!member) return [];

    const checks = [
      ["Date of birth", member.dateOfBirth],
      ["Phone", member.phone],
      ["Email", member.email],
      ["Family", member.familyName],
      ["Education level", member.educationLevel],
      ["Field of study", member.fieldOfStudy],
      ["Workplace", member.workplace],
      ["Work type", member.workType],
      ["Zone", member.zone],
      ["Kebele", member.kebele],
      ["Health status", member.healthStatus],
    ];

    return checks
      .filter(([, value]) => isMissing(value))
      .map(([label]) => String(label));
  }, [member]);

  function openEdit() {
    setMessage("");
    setError("");
    setEditForm(makeEditForm(member));
    setIsEditOpen(true);
  }

  function updateField<K extends keyof MyMemberProfileUpdatePayload>(
    field: K,
    value: MyMemberProfileUpdatePayload[K]
  ) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await updateMyMemberProfile(editForm);
      setMember(updated);
      setEditForm(makeEditForm(updated));
      setIsEditOpen(false);
      setMessage("Profile updated successfully.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aw-design-page member-detail-redesign flex min-h-0 flex-1 flex-col">
        <div className="member-detail-loading">Loading member profile.</div>
      </section>
    );
  }

  return (
    <section className="aw-design-page member-detail-redesign flex min-h-0 flex-1 flex-col gap-5">
      {error ? <div className="aw-error-banner">{error}</div> : null}

      {message ? (
        <div className="rounded-2xl border border-[var(--aw-success)] bg-[var(--aw-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--aw-success)]">
          {message}
        </div>
      ) : null}

      <div className="member-profile-header-card">
        <div className="member-profile-header-top">
          <div className="member-profile-title-area">
            <Link to="/member/profile" className="member-back-link">
              <ArrowLeft size={15} />
              My Profile
            </Link>

            <div className="member-profile-identity-row">
              <div className="member-profile-avatar">
                <span>{profileInitials(member)}</span>
              </div>

              <div className="min-w-0">
                <p className="member-profile-eyebrow">Member profile</p>
                <h1>{fullName}</h1>
                <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">
                  {member?.hibretName || "No Hibret"} · {member?.familyName || "No family assigned"}
                </p>

                <div className="member-profile-status-row">
                  <StatusBadge label={member?.membershipStatus || "Unknown status"} tone="success" />
                  <StatusBadge label={user?.status || "Account status"} tone="primary" />
                  <StatusBadge label={member?.partyRole || "No party role"} tone="muted" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openEdit}
            className="member-profile-primary-action inline-flex items-center justify-center gap-2"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
        </div>

        <div className="member-profile-summary-bar">
          <div className="member-profile-progress-card">
            <div className="member-summary-label-row">
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <div className="member-profile-progress-track">
              <div style={{ width: `${Math.min(100, Math.max(0, profileCompletion))}%` }} />
            </div>
          </div>

          <SummaryItem label="Member code" value={member?.memberCode || "-"} />
          <SummaryItem label="PP ID" value={member?.ppId || "-"} />
          <SummaryItem label="Hibret" value={member?.hibretName || "-"} />
        </div>
      </div>

      <div className="member-detail-layout">
        <main className="member-detail-main space-y-5">
          <ProfileCompletenessCard completion={profileCompletion} missingFields={missingFields} />

          <ProfileSection title="Identity" icon={<IdCard size={18} />}>
            <Detail label="Full name" value={fullName} strong />
            <Detail label="Gender" value={member?.gender} />
            <Detail label="Date of birth" value={formatDate(member?.dateOfBirth)} />
            <Detail label="Member code" value={member?.memberCode} />
            <Detail label="FAN ID" value={member?.fanId} />
            <Detail label="PP ID" value={member?.ppId} />
          </ProfileSection>

          <ProfileSection title="Hibret and family assignment" icon={<ShieldCheck size={18} />}>
            <Detail label="Hibret" value={member?.hibretName} strong />
            <Detail label="Family" value={member?.familyName} />
            <Detail label="Membership status" value={member?.membershipStatus} />
            <Detail label="Registration type" value={member?.registrationType} />
            <Detail label="Membership year" value={member?.membershipYear} />
            <Detail label="Party role" value={member?.partyRole} />
          </ProfileSection>

          <ProfileSection title="Education and work" icon={<GraduationCap size={18} />}>
            <Detail label="Education level" value={member?.educationLevel} />
            <Detail label="Field of study" value={member?.fieldOfStudy} />
            <Detail label="Workplace" value={member?.workplace} />
            <Detail label="Work type" value={member?.workType} />
            <Detail
              label="Work experience"
              value={member?.workExperienceYears ? `${member.workExperienceYears} years` : ""}
            />
          </ProfileSection>

          <ProfileSection title="Location and profile" icon={<MapPin size={18} />}>
            <Detail label="Zone" value={member?.zone} />
            <Detail label="Kebele" value={member?.kebele} />
            <Detail label="Ethnicity" value={member?.ethnicity} />
            <Detail label="Health status" value={member?.healthStatus} />
          </ProfileSection>
        </main>

        <aside className="member-detail-side space-y-5">
          <ProfileSection title="Contact" icon={<Phone size={18} />} compact>
            <Detail label="Phone" value={member?.phone} strong />
            <Detail label="Email" value={member?.email || user?.email} />
          </ProfileSection>

          <ProfileSection title="Account" icon={<Mail size={18} />} compact>
            <Detail label="Login email" value={user?.email} />
            <Detail label="Account status" value={user?.status} />
            <Detail label="Role" value={user?.role} />
          </ProfileSection>

          <ProfileSection title="Recent attendance" icon={<CalendarDays size={18} />} compact>
            {member?.attendance?.length ? (
              <div className="member-attendance-list">
                {member.attendance.slice(0, 6).map((record) => (
                  <div key={record.id} className="member-attendance-row">
                    <div>
                      <strong>{record.announcementTitle}</strong>
                      <span>{record.status}</span>
                    </div>
                    <div>
                      <StatusBadge label={record.status} tone={attendanceTone(record.status)} />
                      <small>{formatDate(record.recordedAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint
                title="No attendance records"
                description="Attendance history will appear here after Hibret attendance is recorded."
              />
            )}
          </ProfileSection>

          <ProfileSection title="Work summary" icon={<BriefcaseBusiness size={18} />} compact>
            <Detail label="Workplace" value={member?.workplace} />
            <Detail label="Work type" value={member?.workType} />
            <Detail
              label="Experience"
              value={member?.workExperienceYears ? `${member.workExperienceYears} years` : ""}
            />
          </ProfileSection>
        </aside>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay-scrim)]">
          <form
            onSubmit={handleSaveProfile}
            className="flex h-full w-full max-w-3xl flex-col border-l border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-text)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-6 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--aw-primary)]">
                  Member profile
                </p>
                <h2 className="mt-1 text-2xl font-black text-[var(--aw-text)]">Edit Profile</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--aw-muted)]">
                  Update contact, education, work, and profile information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <EditGroup title="Personal information">
                  <EditInput label="First name" value={editForm.firstName} onChange={(value) => updateField("firstName", value)} />
                  <EditInput label="Father name" value={editForm.fatherName} onChange={(value) => updateField("fatherName", value)} />
                  <EditInput label="Grandfather name" value={editForm.grandfatherName} onChange={(value) => updateField("grandfatherName", value)} />

                  <label>
                    <span className="text-sm font-black text-[var(--aw-text)]">Gender</span>
                    <select
                      value={inputValue(editForm.gender)}
                      onChange={(event) => updateField("gender", event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--aw-primary)]"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>

                  <EditInput label="Date of birth" type="date" value={editForm.dateOfBirth} onChange={(value) => updateField("dateOfBirth", value)} />
                  <EditInput label="Phone" value={editForm.phone} onChange={(value) => updateField("phone", value)} />
                  <EditInput label="Email" type="email" value={editForm.email} onChange={(value) => updateField("email", value)} />
                </EditGroup>

                <EditGroup title="Membership information">
                  <ReadOnlyInput label="Member code" value={member?.memberCode} />
                  <ReadOnlyInput label="FAN ID" value={member?.fanId} />
                  <ReadOnlyInput label="PP ID" value={member?.ppId} />
                  <ReadOnlyInput label="Hibret" value={member?.hibretName} />
                  <ReadOnlyInput label="Family" value={member?.familyName} />
                  <ReadOnlyInput label="Membership status" value={member?.membershipStatus} />

                  <EditInput label="Registration type" value={editForm.registrationType} onChange={(value) => updateField("registrationType", value)} />
                  <EditInput label="Membership year" value={editForm.membershipYear} onChange={(value) => updateField("membershipYear", value)} />
                  <EditInput label="Party role" value={editForm.partyRole} onChange={(value) => updateField("partyRole", value)} />
                </EditGroup>

                <EditGroup title="Education and work">
                  <EditInput label="Education level" value={editForm.educationLevel} onChange={(value) => updateField("educationLevel", value)} />
                  <EditInput label="Field of study" value={editForm.fieldOfStudy} onChange={(value) => updateField("fieldOfStudy", value)} />
                  <EditInput label="Workplace" value={editForm.workplace} onChange={(value) => updateField("workplace", value)} />
                  <EditInput label="Work type" value={editForm.workType} onChange={(value) => updateField("workType", value)} />
                  <EditInput label="Work experience years" type="number" value={editForm.workExperienceYears} onChange={(value) => updateField("workExperienceYears", value)} />
                </EditGroup>

                <EditGroup title="Location and profile">
                  <EditInput label="Zone" value={editForm.zone} onChange={(value) => updateField("zone", value)} />
                  <EditInput label="Kebele" value={editForm.kebele} onChange={(value) => updateField("kebele", value)} />
                  <EditInput label="Ethnicity" value={editForm.ethnicity} onChange={(value) => updateField("ethnicity", value)} />
                  <EditInput label="Health status" value={editForm.healthStatus} onChange={(value) => updateField("healthStatus", value)} />
                </EditGroup>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="min-h-10 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-5 py-2 text-sm font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-5 py-2 text-sm font-black text-white hover:bg-[var(--aw-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function attendanceTone(status?: string | null): "primary" | "success" | "muted" {
  const value = String(status || "").toLowerCase();
  if (value === "present") return "success";
  if (value === "excused") return "primary";
  return "muted";
}

function EditGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)]">
      <div className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-3">
        <h3 className="text-sm font-black text-[var(--aw-text)]">{title}</h3>
      </div>
      <div className="form-grid p-4">{children}</div>
    </section>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: unknown }) {
  return (
    <label>
      <span className="text-sm font-black text-[var(--aw-text)]">{label}</span>
      <input
        value={inputValue(value) || "-"}
        disabled
        className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--aw-muted)] outline-none"
      />
      <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">Managed by administration.</p>
    </label>
  );
}

function EditInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="text-sm font-black text-[var(--aw-text)]">{label}</span>
      <input
        type={type}
        value={inputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--aw-primary)]"
      />
    </label>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "success" | "muted";
}) {
  const classes =
    tone === "primary"
      ? "border-[var(--aw-primary)]/25 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]"
      : tone === "success"
        ? "border-[var(--aw-success)]/25 bg-[var(--aw-success-bg)] text-[var(--aw-success)]"
        : "border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[var(--aw-muted)]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes}`}>
      {label}
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="member-summary-item">
      <span>{label}</span>
      <strong>{valueText(value)}</strong>
    </div>
  );
}

function ProfileCompletenessCard({
  completion,
  missingFields,
}: {
  completion: number;
  missingFields: string[];
}) {
  return (
    <section className="member-detail-section">
      <div className="member-detail-section-header">
        <div>
          <h2>
            <span>
              <CheckCircle2 size={18} />
            </span>
            Profile completeness
          </h2>
          <p>Use this as a quick check for missing profile information.</p>
        </div>
      </div>

      <div className="p-5">
        <div className="member-summary-label-row">
          <span>Completion</span>
          <strong>{completion}%</strong>
        </div>
        <div className="member-profile-progress-track mt-3">
          <div style={{ width: `${Math.min(100, Math.max(0, completion))}%` }} />
        </div>

        {missingFields.length ? (
          <div className="mt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--aw-muted)]">
              Missing information
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <span
                  key={field}
                  className="inline-flex rounded-full border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-1 text-xs font-black text-[var(--aw-muted)]"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-[var(--aw-success)]">
            Profile information is complete.
          </p>
        )}
      </div>
    </section>
  );
}

function ProfileSection({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="member-detail-section">
      <div className="member-detail-section-header">
        <div>
          <h2>
            {icon ? <span>{icon}</span> : null}
            {title}
          </h2>
        </div>
      </div>
      <div className={compact ? "member-detail-fields is-compact" : "member-detail-fields"}>{children}</div>
    </section>
  );
}

function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: unknown;
  strong?: boolean;
}) {
  const missing = isMissing(value);

  return (
    <div className={missing ? "member-detail-pair is-empty" : "member-detail-pair"}>
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>
        {missing ? "Not recorded" : valueText(value)}
      </strong>
    </div>
  );
}

function EmptyHint({ title, description }: { title: string; description: string }) {
  return (
    <div className="member-detail-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
