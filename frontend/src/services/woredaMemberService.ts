import { apiClient } from "./apiClient";
import { getMockMemberProfile, updateMockMemberProfile } from "./devMockData";
import { isDevMockDataEnabled } from "./runtimeConfig";

export type WoredaMember = {
  id: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;

  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
  name: string;
  gender: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;

  hibretId: string;
  hibretName?: string | null;
  familyId?: string | null;
  familyName?: string | null;

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

  photoFileId?: string | null;
  profileCompletion?: number | null;

  account?: {
    email: string;
    role: string;
    status: string;
    lastLoginAt?: string | null;
    createdAt: string;
  } | null;

  attendance?: Array<{
    id: string;
    announcementTitle: string;
    announcementType: string;
    status: string;
    note?: string | null;
    recordedAt: string;
  }>;

  createdAt: string;
  updatedAt: string;
};

export type WoredaMembersSummary = {
  total: number;
  active: number;
  withAccount: number;
  withoutAccount: number;
};

export type WoredaMembersPagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type WoredaMembersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  hibretId?: string;
  familyId?: string;
  gender?: string;
  accountStatus?: string;
  partyRole?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  workplace?: string;
  workType?: string;
  zone?: string;
  kebele?: string;
  ethnicity?: string;
  healthStatus?: string;
  photoFileId?: string | null;
};

export type MemberFormOptions = {
  hibrets: Array<{
    id: string;
    name: string;
    status?: string | null;
  }>;
  families: Array<{
    id: string;
    name: string;
    hibretId: string;
    status?: string | null;
  }>;
};

export type MemberPayload = {
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
  gender: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  hibretId: string;
  familyId?: string | null;
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
  photoFileId?: string | null;
};

export async function getWoredaMembers(query: WoredaMembersQuery = {}) {
  const response = await apiClient.get<{
    summary: WoredaMembersSummary;
    pagination: WoredaMembersPagination;
    members: WoredaMember[];
  }>("/members", {
    params: query,
  });

  return response.data;
}

export async function getWoredaMember(memberId: string) {
  const response = await apiClient.get<{ member: WoredaMember }>(
    `/members/${memberId}`
  );

  return response.data.member;
}

export async function getMemberFormOptions() {
  const response = await apiClient.get<{ options: MemberFormOptions }>(
    "/members/form-options"
  );

  return response.data.options;
}

export async function createWoredaMember(payload: MemberPayload) {
  const response = await apiClient.post<{ member: WoredaMember }>(
    "/members",
    payload
  );

  return response.data.member;
}

export async function updateWoredaMember(memberId: string, payload: MemberPayload) {
  const response = await apiClient.patch<{ member: WoredaMember }>(
    `/members/${memberId}`,
    payload
  );

  return response.data.member;
}

export type MemberAccountOperationResult = {
  message: string;
  account?: {
    email: string;
    role: string;
    status: string;
    setupUrl?: string | null;
    previewUrl?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string;
  };
};

export async function createMemberAccount(memberId: string) {
  const response = await apiClient.post<MemberAccountOperationResult>(
    `/members/${memberId}/account`
  );

  return response.data;
}

export async function resendMemberSetup(memberId: string) {
  const response = await apiClient.post<MemberAccountOperationResult>(
    `/members/${memberId}/account/resend-setup`
  );

  return response.data;
}

export async function updateMemberAccountStatus(
  memberId: string,
  status: "ACTIVE" | "DISABLED" | "PENDING_SETUP"
) {
  const response = await apiClient.patch<MemberAccountOperationResult>(
    `/members/${memberId}/account/status`,
    { status }
  );

  return response.data;
}


export async function bulkCreateMemberAccounts(memberIds: string[]) {
  const response = await apiClient.post<{
    message: string;
    created: number;
    skipped: number;
    results: Array<{
      memberId: string;
      name: string;
      email?: string;
      status: "created" | "skipped";
      message?: string;
      setupUrl?: string;
      previewUrl?: string | null;
    }>;
  }>("/members/accounts/bulk-create", { memberIds });

  return response.data;
}

export type MemberImportPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: Partial<MemberPayload> & {
    hibretName?: string | null;
    familyName?: string | null;
  };
  isValid: boolean;
  errors: string[];
};

export async function previewMemberImport(csvText: string) {
  const response = await apiClient.post<{
    rows: MemberImportPreviewRow[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  }>("/members/import/preview", { csvText });

  return response.data;
}

export async function commitMemberImport(rows: MemberImportPreviewRow[]) {
  const response = await apiClient.post<{
    message: string;
    createdCount: number;
    failedCount: number;
    created: Array<{
      rowNumber: number;
      member: WoredaMember;
    }>;
    failed: Array<{
      rowNumber: number;
      message: string;
    }>;
  }>("/members/import/commit", { rows });

  return response.data;
}


export async function getMyMemberProfile() {
  try {
    const response = await apiClient.get<{ member: WoredaMember }>("/members/me/profile");
    return response.data.member;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return getMockMemberProfile();
    }
    throw error;
  }
}


export type MyMemberProfileUpdatePayload = {
  firstName?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  registrationType?: string | null;
  membershipYear?: string | null;
  partyRole?: string | null;
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
  workplace?: string | null;
  workType?: string | null;
  workExperienceYears?: number | string | null;
  zone?: string | null;
  kebele?: string | null;
  ethnicity?: string | null;
  healthStatus?: string | null;
  photoFileId?: string | null;
};

export async function updateMyMemberProfile(payload: MyMemberProfileUpdatePayload) {
  try {
    const response = await apiClient.patch<{ member: WoredaMember }>("/members/me/profile", payload);
    return response.data.member;
  } catch (error) {
    if (isDevMockDataEnabled()) {
      return updateMockMemberProfile(payload);
    }
    throw error;
  }
}


export type MemberFilterOption = {
  value: string;
  label: string;
  count: number;
  hibretId?: string;
};

export type MemberFilterOptionsResponse = {
  total: number;
  gender: MemberFilterOption[];
  faydaStatus: MemberFilterOption[];
  ppStatus: MemberFilterOption[];
  workType: MemberFilterOption[];
  educationLevel: MemberFilterOption[];
  healthStatus: MemberFilterOption[];
  registrationType: MemberFilterOption[];
  membershipStatus: MemberFilterOption[];
  hibrets: MemberFilterOption[];
  families: MemberFilterOption[];
};

export async function getMemberFilterOptions() {
  const response = await apiClient.get<{ options: MemberFilterOptionsResponse }>("/members/filter-options");
  return response.data.options;
}
