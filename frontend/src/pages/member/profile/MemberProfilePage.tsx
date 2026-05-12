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
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../stores/authStore";
import {
  getMyMemberProfile,
  updateMyMemberProfile,
} from "../../../services/woredaMemberService";
import type {
  MyMemberProfileUpdatePayload,
  WoredaMember,
} from "../../../services/woredaMemberService";
import { LoadingState } from "../../../components/ui/LoadingState";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/shadcn/sheet";
import { statusToBadgeVariant } from "@/lib/badge";

const GENDER_UNSPECIFIED = "__unspecified__";

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

  async function loadProfile() {
    setIsLoading(true);

    try {
      const data = await getMyMemberProfile();
      setMember(data);
      setEditForm(makeEditForm(data));
    } catch {
      toast.error("Unable to load your member profile.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const fullName = useMemo(() => {
    if (!member) return "Member Profile";
    return [member.firstName, member.fatherName, member.grandfatherName]
      .filter(Boolean)
      .join(" ");
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
    setEditForm(makeEditForm(member));
    setIsEditOpen(true);
  }

  function updateField<K extends keyof MyMemberProfileUpdatePayload>(
    field: K,
    value: MyMemberProfileUpdatePayload[K],
  ) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const updated = await updateMyMemberProfile(editForm);
      setMember(updated);
      setEditForm(makeEditForm(updated));
      setIsEditOpen(false);
      toast.success("Profile updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aw-design-page flex min-h-0 flex-1 flex-col">
        <LoadingState label="Loading member profile..." />
      </section>
    );
  }

  return (
    <section className="aw-design-page flex min-h-0 flex-1 flex-col space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/member/profile" className="inline-flex items-center gap-1.5">
                <ArrowLeft aria-hidden />
                My Profile
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-base font-semibold text-foreground">
                {profileInitials(member)}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Member profile
                </p>
                <CardTitle className="mt-0.5 text-base font-semibold">
                  {fullName}
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-muted-foreground">
                  {member?.hibretName || "No Hibret"} ·{" "}
                  {member?.familyName || "No family assigned"}
                </CardDescription>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusToBadgeVariant(member?.membershipStatus)}
                  >
                    {member?.membershipStatus || "Unknown status"}
                  </Badge>
                  <Badge variant={statusToBadgeVariant(user?.status)}>
                    {user?.status || "Account status"}
                  </Badge>
                  <Badge variant="muted">
                    {member?.partyRole || "No party role"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="default" size="default" onClick={openEdit}>
              <Edit3 aria-hidden />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="border-t border-border">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProgressTile completion={profileCompletion} />
            <SummaryItem label="Member code" value={member?.memberCode || "-"} />
            <SummaryItem label="PP ID" value={member?.ppId || "-"} />
            <SummaryItem label="Hibret" value={member?.hibretName || "-"} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <main className="space-y-6">
          <ProfileCompletenessCard
            completion={profileCompletion}
            missingFields={missingFields}
          />

          <ProfileSection title="Identity" icon={<IdCard size={16} aria-hidden />}>
            <Detail label="Full name" value={fullName} strong />
            <Detail label="Gender" value={member?.gender} />
            <Detail label="Date of birth" value={formatDate(member?.dateOfBirth)} />
            <Detail label="Member code" value={member?.memberCode} />
            <Detail label="FAN ID" value={member?.fanId} />
            <Detail label="PP ID" value={member?.ppId} />
          </ProfileSection>

          <ProfileSection
            title="Hibret and family assignment"
            icon={<ShieldCheck size={16} aria-hidden />}
          >
            <Detail label="Hibret" value={member?.hibretName} strong />
            <Detail label="Family" value={member?.familyName} />
            <Detail label="Membership status" value={member?.membershipStatus} />
            <Detail label="Registration type" value={member?.registrationType} />
            <Detail label="Membership year" value={member?.membershipYear} />
            <Detail label="Party role" value={member?.partyRole} />
          </ProfileSection>

          <ProfileSection
            title="Education and work"
            icon={<GraduationCap size={16} aria-hidden />}
          >
            <Detail label="Education level" value={member?.educationLevel} />
            <Detail label="Field of study" value={member?.fieldOfStudy} />
            <Detail label="Workplace" value={member?.workplace} />
            <Detail label="Work type" value={member?.workType} />
            <Detail
              label="Work experience"
              value={
                member?.workExperienceYears
                  ? `${member.workExperienceYears} years`
                  : ""
              }
            />
          </ProfileSection>

          <ProfileSection
            title="Location and profile"
            icon={<MapPin size={16} aria-hidden />}
          >
            <Detail label="Zone" value={member?.zone} />
            <Detail label="Kebele" value={member?.kebele} />
            <Detail label="Ethnicity" value={member?.ethnicity} />
            <Detail label="Health status" value={member?.healthStatus} />
          </ProfileSection>
        </main>

        <aside className="space-y-6">
          <ProfileSection title="Contact" icon={<Phone size={16} aria-hidden />}>
            <Detail label="Phone" value={member?.phone} strong />
            <Detail label="Email" value={member?.email || user?.email} />
          </ProfileSection>

          <ProfileSection title="Account" icon={<Mail size={16} aria-hidden />}>
            <Detail label="Login email" value={user?.email} />
            <Detail label="Account status" value={user?.status} />
            <Detail label="Role" value={user?.role} />
          </ProfileSection>

          <ProfileSection
            title="Recent attendance"
            icon={<CalendarDays size={16} aria-hidden />}
          >
            {member?.attendance?.length ? (
              <div className="space-y-2">
                {member.attendance.slice(0, 6).map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {record.announcementTitle}
                      </p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {record.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusToBadgeVariant(record.status)}>
                        {record.status}
                      </Badge>
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatDate(record.recordedAt)}
                      </span>
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

          <ProfileSection
            title="Work summary"
            icon={<BriefcaseBusiness size={16} aria-hidden />}
          >
            <Detail label="Workplace" value={member?.workplace} />
            <Detail label="Work type" value={member?.workType} />
            <Detail
              label="Experience"
              value={
                member?.workExperienceYears
                  ? `${member.workExperienceYears} years`
                  : ""
              }
            />
          </ProfileSection>
        </aside>
      </div>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
        >
          <SheetHeader className="border-b border-border bg-muted/40 px-6 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Member profile
            </p>
            <SheetTitle className="text-base font-semibold">Edit Profile</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Update contact, education, work, and profile information.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSaveProfile}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <EditGroup title="Personal information">
                  <EditInput
                    label="First name"
                    value={editForm.firstName}
                    onChange={(value) => updateField("firstName", value)}
                  />
                  <EditInput
                    label="Father name"
                    value={editForm.fatherName}
                    onChange={(value) => updateField("fatherName", value)}
                  />
                  <EditInput
                    label="Grandfather name"
                    value={editForm.grandfatherName}
                    onChange={(value) => updateField("grandfatherName", value)}
                  />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="member-profile-gender">Gender</Label>
                    <Select
                      value={inputValue(editForm.gender) || GENDER_UNSPECIFIED}
                      onValueChange={(value) =>
                        updateField(
                          "gender",
                          value === GENDER_UNSPECIFIED ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger id="member-profile-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GENDER_UNSPECIFIED}>
                          Select gender
                        </SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <EditInput
                    label="Date of birth"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(value) => updateField("dateOfBirth", value)}
                  />
                  <EditInput
                    label="Phone"
                    value={editForm.phone}
                    onChange={(value) => updateField("phone", value)}
                  />
                  <EditInput
                    label="Email"
                    type="email"
                    value={editForm.email}
                    onChange={(value) => updateField("email", value)}
                  />
                </EditGroup>

                <EditGroup title="Membership information">
                  <ReadOnlyInput label="Member code" value={member?.memberCode} />
                  <ReadOnlyInput label="FAN ID" value={member?.fanId} />
                  <ReadOnlyInput label="PP ID" value={member?.ppId} />
                  <ReadOnlyInput label="Hibret" value={member?.hibretName} />
                  <ReadOnlyInput label="Family" value={member?.familyName} />
                  <ReadOnlyInput
                    label="Membership status"
                    value={member?.membershipStatus}
                  />

                  <EditInput
                    label="Registration type"
                    value={editForm.registrationType}
                    onChange={(value) => updateField("registrationType", value)}
                  />
                  <EditInput
                    label="Membership year"
                    value={editForm.membershipYear}
                    onChange={(value) => updateField("membershipYear", value)}
                  />
                  <EditInput
                    label="Party role"
                    value={editForm.partyRole}
                    onChange={(value) => updateField("partyRole", value)}
                  />
                </EditGroup>

                <EditGroup title="Education and work">
                  <EditInput
                    label="Education level"
                    value={editForm.educationLevel}
                    onChange={(value) => updateField("educationLevel", value)}
                  />
                  <EditInput
                    label="Field of study"
                    value={editForm.fieldOfStudy}
                    onChange={(value) => updateField("fieldOfStudy", value)}
                  />
                  <EditInput
                    label="Workplace"
                    value={editForm.workplace}
                    onChange={(value) => updateField("workplace", value)}
                  />
                  <EditInput
                    label="Work type"
                    value={editForm.workType}
                    onChange={(value) => updateField("workType", value)}
                  />
                  <EditInput
                    label="Work experience years"
                    type="number"
                    value={editForm.workExperienceYears}
                    onChange={(value) =>
                      updateField("workExperienceYears", value)
                    }
                  />
                </EditGroup>

                <EditGroup title="Location and profile">
                  <EditInput
                    label="Zone"
                    value={editForm.zone}
                    onChange={(value) => updateField("zone", value)}
                  />
                  <EditInput
                    label="Kebele"
                    value={editForm.kebele}
                    onChange={(value) => updateField("kebele", value)}
                  />
                  <EditInput
                    label="Ethnicity"
                    value={editForm.ethnicity}
                    onChange={(value) => updateField("ethnicity", value)}
                  />
                  <EditInput
                    label="Health status"
                    value={editForm.healthStatus}
                    onChange={(value) => updateField("healthStatus", value)}
                  />
                </EditGroup>
              </div>
            </div>

            <SheetFooter className="border-t border-border bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="default"
                disabled={isSaving}
              >
                <Save aria-hidden />
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function ProgressTile({ completion }: { completion: number }) {
  const clamped = Math.min(100, Math.max(0, completion));
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Profile completion
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {clamped}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function EditGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-border bg-muted/40 px-4 py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={inputValue(value) || "-"} disabled readOnly />
      <p className="text-xs text-muted-foreground">
        Managed by administration.
      </p>
    </div>
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
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={inputValue(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-border p-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {valueText(value)}
      </p>
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
  const clamped = Math.min(100, Math.max(0, completion));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CheckCircle2 size={16} aria-hidden className="text-muted-foreground" />
          Profile completeness
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Use this as a quick check for missing profile information.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">Completion</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {clamped}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${clamped}%` }}
          />
        </div>

        {missingFields.length ? (
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Missing information
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <Badge key={field} variant="muted">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm font-medium text-[var(--aw-success)]">
            Profile information is complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icon ? (
            <span className="text-muted-foreground">{icon}</span>
          ) : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
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
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <span
        className={
          strong
            ? "text-sm font-semibold text-foreground"
            : missing
              ? "text-sm font-normal text-muted-foreground"
              : "text-sm font-medium text-foreground"
        }
      >
        {missing ? "Not recorded" : valueText(value)}
      </span>
    </div>
  );
}

function EmptyHint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs font-normal text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
