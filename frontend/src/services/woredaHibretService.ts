import { apiClient } from "./apiClient";

export type WoredaHibretListItem = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  familyCount: number;
  memberCount: number;
  adminCount: number;
  targetedDirectives: number;
  submittedReports: number;
  pendingReports: number;
  reviewedReports: number;
  latestSubmittedAt?: string | null;
  recentDirectives: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    deadline?: string | null;
    attendanceRequired: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type WoredaHibretMember = {
  id: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  name: string;
  gender: string;
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
  zone?: string | null;
  kebele?: string | null;
  ethnicity?: string | null;
  healthStatus?: string | null;
  familyId?: string | null;
  familyName?: string | null;
  accountStatus?: string | null;
  createdAt: string;
};

export type WoredaHibretDirective = {
  id: string;
  title: string;
  type: string;
  status: string;
  deadline?: string | null;
  attendanceRequired: boolean;
  assignedAt: string;
  report?: {
    id: string;
    announcementId: string;
    hibretId: string;
    title: string;
    status: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewDecision?: "approved" | "rejected" | "changes_requested" | null;
    attachmentCount: number;
  } | null;
};

export type WoredaHibretReport = {
  id: string;
  announcementId: string;
  hibretId: string;
  title: string;
  summary?: string | null;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewDecision?: "approved" | "rejected" | "changes_requested" | null;
  reviewComment?: string | null;
  attachmentCount: number;
  announcement?: {
    id: string;
    title: string;
    type: string;
    status: string;
    deadline?: string | null;
    attendanceRequired: boolean;
  } | null;
};

export type WoredaHibretFamilyMember = {
  id: string;
  name: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  gender: string;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: string | null;
  accountStatus?: string | null;
};

export type WoredaHibretFamily = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  status?: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt?: string;
  members: WoredaHibretFamilyMember[];
};

export type FamilyPayload = {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  status?: string | null;
};

export type WoredaHibretDetail = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    members: number;
    admins: number;
    families: number;
    targetedDirectives: number;
    submittedReports: number;
    pendingReports: number;
    reviewedReports: number;
  };
  admins: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    lastLoginAt?: string | null;
    createdAt: string;
  }>;
  members: WoredaHibretMember[];
  directives: WoredaHibretDirective[];
  reports: WoredaHibretReport[];
  families: WoredaHibretFamily[];
};

export async function getWoredaHibrets() {
  const response = await apiClient.get<{ hibrets: WoredaHibretListItem[] }>(
    "/hibrets"
  );

  return response.data.hibrets;
}

export async function getWoredaHibret(hibretId: string) {
  const response = await apiClient.get<{ hibret: WoredaHibretDetail }>(
    `/hibrets/${hibretId}`
  );

  return response.data.hibret;
}


export async function createHibretFamily(hibretId: string, payload: FamilyPayload) {
  const response = await apiClient.post<{ family: WoredaHibretFamily }>(
    `/hibrets/${hibretId}/families`,
    payload
  );

  return response.data.family;
}

export async function updateHibretFamily(
  hibretId: string,
  familyId: string,
  payload: FamilyPayload
) {
  const response = await apiClient.patch<{ family: WoredaHibretFamily }>(
    `/hibrets/${hibretId}/families/${familyId}`,
    payload
  );

  return response.data.family;
}

export async function deleteHibretFamily(hibretId: string, familyId: string) {
  const response = await apiClient.delete<{ message: string }>(
    `/hibrets/${hibretId}/families/${familyId}`
  );

  return response.data;
}

export async function assignMembersToFamily(
  hibretId: string,
  familyId: string,
  memberIds: string[]
) {
  const response = await apiClient.post<{ message: string; assigned: number }>(
    `/hibrets/${hibretId}/families/${familyId}/members`,
    { memberIds }
  );

  return response.data;
}

export async function unassignMembersFromFamily(hibretId: string, memberIds: string[]) {
  const response = await apiClient.post<{ message: string; unassigned: number }>(
    `/hibrets/${hibretId}/families/unassign-members`,
    { memberIds }
  );

  return response.data;
}


export async function updateHibretAccountStatus(
  hibretId: string,
  userId: string,
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP"
) {
  const response = await apiClient.patch<{
    message: string;
    account: {
      id: string;
      email: string;
      role: string;
      status: string;
      lastLoginAt?: string | null;
      createdAt: string;
    };
  }>(`/hibrets/${hibretId}/accounts/${userId}/status`, { status });

  return response.data;
}


export async function bulkUpdateHibretAccountStatus(
  hibretId: string,
  userIds: string[],
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP"
) {
  const response = await apiClient.patch<{
    message: string;
    updated: number;
  }>(`/hibrets/${hibretId}/accounts/status`, { userIds, status });

  return response.data;
}


export type CreateHibretPayload = {
  name: string;
  description?: string | null;
  status?: string | null;
};

export async function createHibret(payload: CreateHibretPayload) {
  const response = await apiClient.post<{ hibret: WoredaHibretListItem }>("/hibrets", payload);
  return response.data.hibret;
}
