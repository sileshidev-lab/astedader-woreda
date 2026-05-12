import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  IdCard,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/shadcn/button";
import { AUTH_TOKEN_KEY } from "../../../services/apiClient";
import { getApiBaseUrl } from "../../../services/runtimeConfig";
import {
  createMemberAccount,
  getMemberFormOptions,
  getWoredaMember,
  resendMemberSetup,
  updateMemberAccountStatus,
  updateWoredaMember,
} from "../../../services/woredaMemberService";
import type {
  MemberFormOptions,
  MemberPayload,
  WoredaMember,
} from "../../../services/woredaMemberService";
import { MemberFormDrawer } from "./MemberFormDrawer";
import { readErrorMessage } from "@/lib/errors";

const API_BASE_URL = getApiBaseUrl();

function memberPhotoUrl(photoFileId?: string | null) {
  if (!photoFileId) return "";
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const query = token
    ? `?inline=true&token=${encodeURIComponent(token)}`
    : "?inline=true";
  return `${API_BASE_URL}/files/${photoFileId}/download${query}`;
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "-") {
    return "Not provided";
  }
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleString();
}

function profileInitials(member: WoredaMember) {
  return (
    [member.firstName, member.fatherName]
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "MB"
  );
}

function statusTone(status?: string | null) {
  const clean = String(status || "").toLowerCase();

  if (clean === "active" || clean === "present" || clean === "approved")
    return "success";
  if (
    clean === "pending_setup" ||
    clean === "pending" ||
    clean === "changes_requested"
  )
    return "warning";
  if (clean === "disabled" || clean === "rejected" || clean === "absent")
    return "danger";
  return "muted";
}

function safeCompletion(value?: number | null) {
  return Math.min(100, Math.max(0, Number(value || 0)));
}

export function MemberDetailPage() {
  const { memberId } = useParams();
  const location = useLocation();
  const membersBackDefaultPath = location.pathname.startsWith("/hibret")
    ? "/hibret/members"
    : "/woreda/members";
  const returnTo = new URLSearchParams(location.search).get("returnTo");
  const membersBackPath =
    returnTo && returnTo.startsWith("/") ? returnTo : membersBackDefaultPath;

  const [member, setMember] = useState<WoredaMember | null>(null);
  const [formOptions, setFormOptions] = useState<MemberFormOptions>({
    hibrets: [],
    families: [],
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccountBusy, setIsAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadMember = useCallback(async () => {
    if (!memberId) return;

    setIsLoading(true);

    try {
      const [data, options] = await Promise.all([
        getWoredaMember(memberId),
        getMemberFormOptions(),
      ]);

      setMember(data);
      setFormOptions(options);
    } catch {
      toast.error("Unable to load member profile.");
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMember();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMember]);

  async function handleUpdateMember(payload: MemberPayload) {
    if (!memberId) return;

    setIsSaving(true);

    try {
      const updated = await updateWoredaMember(memberId, payload);
      setMember(updated);
      setIsEditOpen(false);
      await loadMember();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to update member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateAccount() {
    if (!memberId) return;

    setIsAccountBusy(true);
    setAccountMessage("");

    try {
      const result = await createMemberAccount(memberId);
      setAccountMessage(result.message);
      await loadMember();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to create account.");
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function handleResendSetup() {
    if (!memberId) return;

    setIsAccountBusy(true);
    setAccountMessage("");

    try {
      const result = await resendMemberSetup(memberId);
      setAccountMessage(result.message);
      await loadMember();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to resend setup email.");
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function handleAccountStatus(
    status: "ACTIVE" | "DISABLED" | "PENDING_SETUP",
  ) {
    if (!memberId) return;

    setIsAccountBusy(true);
    setAccountMessage("");

    try {
      const result = await updateMemberAccountStatus(memberId, status);
      setAccountMessage(result.message);
      await loadMember();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to update account status.");
    } finally {
      setIsAccountBusy(false);
    }
  }

  const completion = useMemo(
    () => safeCompletion(member?.profileCompletion),
    [member],
  );

  if (isLoading) {
    return (
      <section className="member-detail-redesign flex min-h-0 flex-1 flex-col">
        <div className="member-detail-loading">Loading member profile.</div>
      </section>
    );
  }

  if (!member) {
    return (
      <section className="member-detail-redesign flex min-h-0 flex-1 flex-col">
        <div className="member-detail-loading">Member not found.</div>
      </section>
    );
  }

  return (
    <section className="member-detail-redesign flex min-h-0 flex-1 flex-col gap-5">
      <div className="member-profile-header-card">
        <div className="member-profile-header-top">
          <div className="member-profile-title-area">
            <Link to={membersBackPath} className="member-back-link">
              <ArrowLeft size={15} />
              Back to Members
            </Link>

            <div className="member-profile-identity-row">
              <div className="member-profile-avatar">
                {member.photoFileId ? (
                  <img
                    src={memberPhotoUrl(member.photoFileId)}
                    alt={member.name || "Member photo"}
                  />
                ) : (
                  <span>{profileInitials(member)}</span>
                )}
              </div>

              <div className="min-w-0">
                <p className="member-profile-eyebrow">Member profile</p>
                <h1>{member.name}</h1>
                <div className="member-profile-status-row">
                  <StatusPill
                    label={member.membershipStatus || "Unknown status"}
                    tone={statusTone(member.membershipStatus)}
                  />
                  <StatusPill
                    label={member.account?.status || "No account linked"}
                    tone={
                      member.account
                        ? statusTone(member.account.status)
                        : "muted"
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="default"
            onClick={() => setIsEditOpen(true)}
          >
            Edit Profile
          </Button>
        </div>

        <div className="member-profile-summary-bar">
          <div className="member-profile-progress-card">
            <div className="member-summary-label-row">
              <span>Profile completion</span>
              <strong>{completion}%</strong>
            </div>
            <div className="member-profile-progress-track">
              <div style={{ width: `${completion}%` }} />
            </div>
          </div>

          <SummaryItem label="Hibret" value={member.hibretName} />
          <SummaryItem
            label="Family"
            value={member.familyName || "Unassigned"}
          />
          <SummaryItem label="Membership year" value={member.membershipYear} />
        </div>
      </div>

      <div className="member-detail-layout">
        <main className="member-detail-main">
          <CleanSection title="Identity" icon={<IdCard size={18} />}>
            <DetailPair label="Full name" value={member.name} strong />
            <DetailPair label="Gender" value={member.gender} />
            <DetailPair
              label="Date of birth"
              value={formatDate(member.dateOfBirth)}
            />
            <DetailPair label="Member code" value={member.memberCode} />
            <DetailPair label="FAN ID" value={member.fanId} />
            <DetailPair label="PP ID" value={member.ppId} />
          </CleanSection>

          <CleanSection title="Membership">
            <DetailPair label="Status" value={member.membershipStatus} strong />
            <DetailPair
              label="Registration type"
              value={member.registrationType}
            />
            <DetailPair label="Membership year" value={member.membershipYear} />
            <DetailPair label="Party role" value={member.partyRole} />
          </CleanSection>

          <CleanSection title="Education and work">
            <DetailPair label="Education level" value={member.educationLevel} />
            <DetailPair label="Field of study" value={member.fieldOfStudy} />
            <DetailPair label="Workplace" value={member.workplace} />
            <DetailPair label="Work type" value={member.workType} />
            <DetailPair
              label="Work experience"
              value={
                member.workExperienceYears !== null &&
                member.workExperienceYears !== undefined
                  ? `${member.workExperienceYears} years`
                  : null
              }
            />
          </CleanSection>

          <section className="member-detail-section">
            <div className="member-detail-section-header">
              <div>
                <h2>Recent attendance</h2>
                <p>Latest attendance records connected to Woreda directives.</p>
              </div>
            </div>

            <div className="member-attendance-list">
              {!member.attendance?.length ? (
                <EmptyState
                  title="No attendance records yet"
                  description="Attendance history will appear here after Hibret attendance is recorded."
                />
              ) : (
                member.attendance.map((record) => (
                  <div key={record.id} className="member-attendance-row">
                    <div>
                      <strong>{record.announcementTitle}</strong>
                      <span>{record.announcementType.replace("_", " ")}</span>
                    </div>
                    <div>
                      <StatusPill
                        label={record.status}
                        tone={statusTone(record.status)}
                      />
                      <small>{formatDate(record.recordedAt)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        <aside className="member-detail-side">
          <CleanSection title="Contact" icon={<Phone size={18} />} compact>
            <DetailPair label="Phone" value={member.phone} />
            <DetailPair label="Email" value={member.email} />
          </CleanSection>

          <CleanSection title="Assignment" icon={<MapPin size={18} />} compact>
            <DetailPair label="Hibret" value={member.hibretName} strong />
            <DetailPair
              label="Family"
              value={member.familyName || "Unassigned"}
            />
            <DetailPair label="Zone" value={member.zone} />
            <DetailPair label="Kebele" value={member.kebele} />
            <DetailPair label="Health status" value={member.healthStatus} />
            <DetailPair label="Ethnicity" value={member.ethnicity} />
          </CleanSection>

          <section className="member-detail-section member-account-status-card">
            <div className="member-detail-section-header">
              <div>
                <h2>Account</h2>
                <p>Member login status and account actions.</p>
              </div>
            </div>

            {member.account ? (
              <div className="member-account-content">
                <div className="member-account-current">
                  <BadgeCheck size={18} />
                  <div>
                    <strong>{member.account.email}</strong>
                    <StatusPill
                      label={member.account.status}
                      tone={statusTone(member.account.status)}
                    />
                  </div>
                </div>

                <DetailPair
                  label="Last login"
                  value={formatDate(member.account.lastLoginAt)}
                />
                <DetailPair
                  label="Created"
                  value={formatDate(member.account.createdAt)}
                />

                <div className="member-account-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isAccountBusy}
                    onClick={handleResendSetup}
                  >
                    Resend Setup Link
                  </Button>

                  {member.account.status === "DISABLED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isAccountBusy}
                      onClick={() => handleAccountStatus("ACTIVE")}
                    >
                      Reactivate Account
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isAccountBusy}
                      onClick={() => handleAccountStatus("DISABLED")}
                    >
                      Disable Account
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="member-account-empty">
                <Mail size={22} />
                <h3>No account linked</h3>
                <p>Email ready: {member.email || "No email recorded"}</p>
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  disabled={isAccountBusy || !member.email}
                  onClick={handleCreateAccount}
                >
                  Create Account
                </Button>
              </div>
            )}

            {accountMessage ? (
              <div className="member-account-message">
                <CheckCircle2 size={16} />
                <div>
                  <strong>{accountMessage}</strong>
                  <p>Setup email has been sent to the member email address.</p>
                </div>
              </div>
            ) : null}
          </section>

          <CleanSection
            title="Record dates"
            icon={<CalendarDays size={18} />}
            compact
          >
            <DetailPair label="Created" value={formatDate(member.createdAt)} />
            <DetailPair label="Updated" value={formatDate(member.updatedAt)} />
          </CleanSection>
        </aside>
      </div>

      <MemberFormDrawer
        title="Edit Member Profile"
        isOpen={isEditOpen}
        member={member}
        options={formOptions}
        isSaving={isSaving}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateMember}
      />
    </section>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  return (
    <span className={`member-status-clean member-status-${tone}`}>
      <i />
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

function CleanSection({
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
      <div
        className={
          compact ? "member-detail-fields is-compact" : "member-detail-fields"
        }
      >
        {children}
      </div>
    </section>
  );
}

function DetailPair({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: unknown;
  strong?: boolean;
}) {
  const missing =
    value === null || value === undefined || value === "" || value === "-";

  return (
    <div
      className={missing ? "member-detail-pair is-empty" : "member-detail-pair"}
    >
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>
        {missing ? "Not provided" : valueText(value)}
      </strong>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="member-detail-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
