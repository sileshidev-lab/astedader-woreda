import { apiClient } from "./apiClient";
import type { ResourceItem } from "./contentService";

export type HibretFamilyMember = {
  id: string;
  name: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: string | null;
  accountStatus?: string | null;
};

export type HibretFamily = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  status?: string | null;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
  members: HibretFamilyMember[];
};

export type HibretMember = {
  id: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string | null;
  name: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: string | null;
  registrationType?: string | null;
  membershipYear?: number | null;
  partyRole?: string | null;
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
  workplace?: string | null;
  workType?: string | null;
  workExperienceYears?: number | null;
  zone?: string | null;
  kebele?: string | null;
  ethnicity?: string | null;
  healthStatus?: string | null;
  familyId?: string | null;
  familyName?: string | null;
  accountStatus?: string | null;
  createdAt?: string;
};

export type HibretDirective = {
  id: string;
  title: string;
  type: string;
  status: string;
  deadline?: string | null;
  attendanceRequired?: boolean;
  assignedAt?: string;
  report?: {
    id: string;
    title: string;
    status: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewDecision?: string | null;
    attachmentCount?: number;
  } | null;
};

export type HibretPortalDetail = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  counts: {
    members: number;
    admins: number;
    families: number;
    targetedDirectives: number;
    submittedReports: number;
    pendingReports: number;
    reviewedReports: number;
  };
  members: HibretMember[];
  families: HibretFamily[];
  directives: HibretDirective[];
  reports: Array<{
    id: string;
    title: string;
    status: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewDecision?: string | null;
    attachmentCount?: number;
  }>;
};

export type ChatMessage = {
  id: string;
  body: string;
  senderName?: string | null;
  senderEmail?: string | null;
  createdAt: string;
  mine?: boolean;
};

export async function getMyHibretPortalDetail(hibretId?: string | null) {
  const response = await apiClient.get<{ hibret: HibretPortalDetail }>(
    hibretId ? `/hibrets/${hibretId}` : "/hibret/detail"
  );

  return response.data.hibret;
}

export async function getHibretResources() {
  const response = await apiClient.get<{
    resources: ResourceItem[];
    summary: { total: number; published: number; drafts: number; archived: number };
  }>("/resources");

  return {
    ...response.data,
    resources: response.data.resources.filter(
      (item) =>
        item.status === "published" &&
        (item.targetRoles.includes("HIBRET_ADMIN") || item.targetRoles.includes("MEMBER"))
    ),
  };
}

export async function getChatMessages() {
  try {
    const response = await apiClient.get<{ messages: ChatMessage[] }>("/chat/messages");
    return response.data.messages;
  } catch {
    return [];
  }
}

export async function sendChatMessage(body: string) {
  try {
    const response = await apiClient.post<{ message: ChatMessage }>("/chat/messages", { body });
    return response.data.message;
  } catch {
    return {
      id: `local-${Date.now()}`,
      body,
      senderName: "You",
      createdAt: new Date().toISOString(),
      mine: true,
    };
  }
}
