import type { PaginationMeta } from "./announcementService";
import type { Broadcast, ResourceItem } from "./contentService";
import type { HibretAnnouncementsSummary, HibretAttendance } from "./hibretService";
import type { ManagedUser } from "./userService";
import type { Announcement } from "../types/announcement";
import type { WoredaMember, MyMemberProfileUpdatePayload } from "./woredaMemberService";

const STORE_KEYS = {
  users: "astedader_dev_mock_users",
  memberProfile: "astedader_dev_mock_member_profile",
} as const;

const now = "2026-05-10T10:00:00.000Z";

const mockAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "Quarterly membership review and attendance verification",
    type: "meeting",
    instructions: "Collect attendance, confirm active members, and submit the review summary by Friday.",
    status: "published",
    deadline: "2026-05-18T17:00:00.000Z",
    attendanceRequired: true,
    publishedAt: "2026-05-07T08:00:00.000Z",
    createdAt: "2026-05-06T08:00:00.000Z",
    updatedAt: "2026-05-07T08:00:00.000Z",
    targets: [{ id: "target-1", hibretId: "hib-1", hibret: { id: "hib-1", name: "Bole 01 Hibret" } }],
    reports: [
      {
        id: "report-1",
        announcementId: "ann-1",
        hibretId: "hib-1",
        status: "submitted",
        submittedAt: "2026-05-08T15:30:00.000Z",
        reviewDecision: "approved",
      },
    ],
    attachments: [],
  },
  {
    id: "ann-2",
    title: "Community trend report on youth participation",
    type: "trend_report",
    instructions: "Summarize current youth participation trends and identify the top three blockers.",
    status: "published",
    deadline: "2026-05-21T17:00:00.000Z",
    attendanceRequired: false,
    publishedAt: "2026-05-05T11:00:00.000Z",
    createdAt: "2026-05-04T09:00:00.000Z",
    updatedAt: "2026-05-05T11:00:00.000Z",
    targets: [{ id: "target-2", hibretId: "hib-1", hibret: { id: "hib-1", name: "Bole 01 Hibret" } }],
    reports: [],
    attachments: [],
  },
  {
    id: "ann-3",
    title: "Women leadership mobilization conference preparation",
    type: "conference",
    instructions: "Prepare the Hibret delegation list, logistics plan, and final readiness checklist.",
    status: "closed",
    deadline: "2026-05-02T17:00:00.000Z",
    attendanceRequired: true,
    publishedAt: "2026-04-25T08:00:00.000Z",
    closedAt: "2026-05-03T18:00:00.000Z",
    createdAt: "2026-04-24T09:00:00.000Z",
    updatedAt: "2026-05-03T18:00:00.000Z",
    targets: [{ id: "target-3", hibretId: "hib-1", hibret: { id: "hib-1", name: "Bole 01 Hibret" } }],
    reports: [
      {
        id: "report-3",
        announcementId: "ann-3",
        hibretId: "hib-1",
        status: "changes_requested",
        submittedAt: "2026-04-30T12:00:00.000Z",
        reviewDecision: "changes_requested",
      },
    ],
    attachments: [],
  },
];

const mockResources: ResourceItem[] = [
  {
    id: "res-1",
    title: "Monthly communication guideline",
    description: "Official communications guide for Hibret leaders and members.",
    status: "published",
    category: "Communication",
    fileId: "file-res-1",
    targetRoles: ["HIBRET_ADMIN", "MEMBER"],
    file: {
      id: "file-res-1",
      originalName: "communication-guideline.pdf",
      mimeType: "application/pdf",
      sizeBytes: 241920,
      createdAt: now,
    },
    publishedAt: "2026-05-01T08:00:00.000Z",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    attachmentCount: 0 as never,
  } as ResourceItem,
  {
    id: "res-2",
    title: "Attendance checklist template",
    description: "Reusable checklist for directive attendance and follow-up.",
    status: "published",
    category: "Operations",
    fileId: "file-res-2",
    targetRoles: ["HIBRET_ADMIN"],
    file: {
      id: "file-res-2",
      originalName: "attendance-checklist.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 98212,
      createdAt: now,
    },
    publishedAt: "2026-05-03T08:00:00.000Z",
    createdAt: "2026-05-03T08:00:00.000Z",
    updatedAt: "2026-05-03T08:00:00.000Z",
    attachmentCount: 0 as never,
  } as ResourceItem,
  {
    id: "res-3",
    title: "Member civic education reading pack",
    description: "Member-facing civic education materials and summary sheets.",
    status: "published",
    category: "Education",
    fileId: "file-res-3",
    targetRoles: ["MEMBER"],
    file: {
      id: "file-res-3",
      originalName: "civic-education-pack.pdf",
      mimeType: "application/pdf",
      sizeBytes: 531441,
      createdAt: now,
    },
    publishedAt: "2026-05-04T08:00:00.000Z",
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z",
    attachmentCount: 0 as never,
  } as ResourceItem,
];

const mockBroadcasts: Broadcast[] = [
  {
    id: "bc-1",
    title: "Woreda weekly communication brief",
    summary: "A unified weekly brief covering directives, resources, and attendance reminders.",
    bodyHtml: "<p>This week’s brief includes reporting reminders, leadership preparation, and resource updates for all users.</p>",
    status: "published",
    coverFileId: null,
    targetRoles: ["WOREDA_ADMIN", "HIBRET_ADMIN", "MEMBER"],
    attachmentCount: 0,
    attachments: [],
    publishedAt: "2026-05-08T10:00:00.000Z",
    createdAt: "2026-05-08T10:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
  },
  {
    id: "bc-2",
    title: "Leadership focus for the month",
    summary: "A short note on operational focus and membership follow-through.",
    bodyHtml: "<p>Focus on completion, attendance quality, and communication consistency across the system.</p>",
    status: "published",
    coverFileId: null,
    targetRoles: ["HIBRET_ADMIN", "MEMBER"],
    attachmentCount: 0,
    attachments: [],
    publishedAt: "2026-05-06T09:00:00.000Z",
    createdAt: "2026-05-06T09:00:00.000Z",
    updatedAt: "2026-05-06T09:00:00.000Z",
  },
];

const defaultManagedUsers: ManagedUser[] = [
  {
    id: "user-1",
    email: "hana.member@astedader.local",
    role: "MEMBER",
    status: "ACTIVE",
    hibretId: "hib-1",
    hibretName: "Bole 01 Hibret",
    memberId: "member-1",
    memberName: "Hana Bekele",
    lastLoginAt: "2026-05-09T12:30:00.000Z",
    createdAt: "2026-04-03T08:00:00.000Z",
  },
  {
    id: "user-2",
    email: "samuel.member@astedader.local",
    role: "MEMBER",
    status: "PENDING_SETUP",
    hibretId: "hib-1",
    hibretName: "Bole 01 Hibret",
    memberId: "member-2",
    memberName: "Samuel Tadesse",
    lastLoginAt: null,
    createdAt: "2026-04-11T08:00:00.000Z",
  },
  {
    id: "user-3",
    email: "selam.member@astedader.local",
    role: "MEMBER",
    status: "DISABLED",
    hibretId: "hib-2",
    hibretName: "Kirkos 03 Hibret",
    memberId: "member-3",
    memberName: "Selam Fikru",
    lastLoginAt: "2026-04-27T10:15:00.000Z",
    createdAt: "2026-03-21T08:00:00.000Z",
  },
];

const defaultMemberProfile: WoredaMember = {
  id: "member-1",
  memberCode: "MBR-00142",
  fanId: "FAN-9812",
  ppId: "PP-44120",
  firstName: "Hana",
  fatherName: "Bekele",
  grandfatherName: "Worku",
  name: "Hana Bekele Worku",
  gender: "female",
  dateOfBirth: "1996-09-14",
  phone: "+251911234567",
  email: "hana.member@astedader.local",
  hibretId: "hib-1",
  hibretName: "Bole 01 Hibret",
  familyId: "fam-1",
  familyName: "Bole North Family",
  membershipStatus: "Active member",
  registrationType: "Regular",
  membershipYear: 2021,
  partyRole: "Youth coordinator",
  educationLevel: "Bachelor's degree",
  fieldOfStudy: "Public Administration",
  workplace: "Bole Sub-city office",
  workType: "Civil service",
  workExperienceYears: 4,
  zone: "Addis Ababa",
  kebele: "Bole 01",
  ethnicity: "Oromo",
  healthStatus: "Healthy",
  photoFileId: null,
  profileCompletion: 86,
  account: {
    email: "hana.member@astedader.local",
    role: "MEMBER",
    status: "ACTIVE",
    lastLoginAt: "2026-05-09T12:30:00.000Z",
    createdAt: "2026-04-03T08:00:00.000Z",
  },
  attendance: [
    {
      id: "att-1",
      announcementTitle: "Quarterly membership review and attendance verification",
      announcementType: "meeting",
      status: "present",
      recordedAt: "2026-05-08T13:00:00.000Z",
    },
    {
      id: "att-2",
      announcementTitle: "Women leadership mobilization conference preparation",
      announcementType: "conference",
      status: "excused",
      recordedAt: "2026-04-30T11:00:00.000Z",
    },
  ],
  createdAt: "2026-04-03T08:00:00.000Z",
  updatedAt: now,
};

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeNullableNumber(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getMockAnnouncements(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
} = {}) {
  let items = [...mockAnnouncements];
  if (params.search) {
    const query = params.search.toLowerCase();
    items = items.filter((item) => item.title.toLowerCase().includes(query));
  }
  if (params.type && params.type !== "all") {
    items = items.filter((item) => item.type === params.type);
  }
  if (params.status && params.status !== "all") {
    items = items.filter((item) => item.status === params.status);
  }

  const pageSize = params.pageSize || 20;
  const page = params.page || 1;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const announcements = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary: HibretAnnouncementsSummary = {
    assigned: mockAnnouncements.length,
    submitted: mockAnnouncements.filter((item) => item.reports[0]?.status === "submitted").length,
    pending: mockAnnouncements.filter((item) => !item.reports.length).length,
    approved: mockAnnouncements.filter((item) => item.reports[0]?.reviewDecision === "approved").length,
  };

  const pagination: PaginationMeta = {
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };

  return { announcements, pagination, summary };
}

export function getMockAnnouncementById(announcementId: string) {
  return mockAnnouncements.find((item) => item.id === announcementId) || mockAnnouncements[0];
}

export function getMockAttendance(): HibretAttendance {
  return {
    announcement: {
      id: "ann-1",
      title: "Quarterly membership review and attendance verification",
      attendanceRequired: true,
      status: "published",
    },
    hibret: {
      id: "hib-1",
      name: "Bole 01 Hibret",
    },
    summary: {
      total: 6,
      marked: 5,
      unmarked: 1,
      present: 3,
      absent: 1,
      excused: 1,
      attendanceRate: 60,
      completionRate: 83,
    },
    members: [
      { memberId: "member-1", memberCode: "MBR-00142", name: "Hana Bekele", gender: "female", status: "present" },
      { memberId: "member-2", memberCode: "MBR-00143", name: "Samuel Tadesse", gender: "male", status: "absent" },
      { memberId: "member-3", memberCode: "MBR-00144", name: "Selam Fikru", gender: "female", status: "excused" },
      { memberId: "member-4", memberCode: "MBR-00145", name: "Meron Desta", gender: "female", status: "present" },
      { memberId: "member-5", memberCode: "MBR-00146", name: "Yonas Alemu", gender: "male", status: "present" },
      { memberId: "member-6", memberCode: "MBR-00147", name: "Dawit Melese", gender: "male", status: null },
    ],
  };
}

export function getMockResources() {
  const resources = [...mockResources];
  return {
    resources,
    summary: {
      total: resources.length,
      published: resources.filter((item) => item.status === "published").length,
      drafts: 0,
      archived: 0,
    },
  };
}

export function getMockBroadcasts() {
  const broadcasts = [...mockBroadcasts];
  return {
    broadcasts,
    summary: {
      total: broadcasts.length,
      published: broadcasts.filter((item) => item.status === "published").length,
      drafts: 0,
      archived: 0,
    },
  };
}

export function getMockManagedUsers(query: { search?: string; status?: string; role?: string } = {}) {
  let users = readStored(STORE_KEYS.users, defaultManagedUsers);
  if (query.role) users = users.filter((item) => item.role === query.role);
  if (query.search) {
    const needle = query.search.toLowerCase();
    users = users.filter((item) =>
      [item.email, item.memberName, item.hibretName].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }
  if (query.status) users = users.filter((item) => item.status === query.status);

  return {
    summary: {
      total: users.length,
      active: users.filter((item) => item.status === "ACTIVE").length,
      pending: users.filter((item) => item.status === "PENDING_SETUP").length,
      disabled: users.filter((item) => item.status === "DISABLED").length,
    },
    users,
  };
}

export function updateMockManagedUserStatus(userId: string, status: ManagedUser["status"]) {
  const users = readStored(STORE_KEYS.users, defaultManagedUsers).map((item) =>
    item.id === userId ? { ...item, status } : item
  );
  writeStored(STORE_KEYS.users, users);
  return users.find((item) => item.id === userId) || users[0];
}

export function bulkUpdateMockManagedUsers(userIds: string[], status: ManagedUser["status"]) {
  const users = readStored(STORE_KEYS.users, defaultManagedUsers).map((item) =>
    userIds.includes(item.id) ? { ...item, status } : item
  );
  writeStored(STORE_KEYS.users, users);
  return { updated: userIds.length, message: "Mock users updated." };
}

export function getMockMemberProfile() {
  return readStored(STORE_KEYS.memberProfile, defaultMemberProfile);
}

export function updateMockMemberProfile(payload: MyMemberProfileUpdatePayload) {
  const current = readStored(STORE_KEYS.memberProfile, defaultMemberProfile);
  const firstName = payload.firstName ?? current.firstName;
  const fatherName = payload.fatherName ?? current.fatherName;
  const grandfatherName = payload.grandfatherName ?? current.grandfatherName;
  const next: WoredaMember = {
    ...current,
    ...payload,
    firstName,
    fatherName,
    grandfatherName,
    gender: payload.gender ?? current.gender,
    membershipYear:
      payload.membershipYear !== undefined
        ? normalizeNullableNumber(payload.membershipYear)
        : current.membershipYear,
    workExperienceYears:
      payload.workExperienceYears !== undefined
        ? normalizeNullableNumber(payload.workExperienceYears)
        : current.workExperienceYears,
    name: [firstName, fatherName, grandfatherName].filter(Boolean).join(" "),
    updatedAt: new Date().toISOString(),
  };
  writeStored(STORE_KEYS.memberProfile, next);
  return next;
}
