import {
  bulkCreateMemberAccounts,
  createMemberAccount,
  createWoredaMember,
  getMemberFilterOptions,
  getMemberFormOptions,
  getMyMemberProfile,
  getWoredaMember,
  getWoredaMembers,
  resendMemberSetup,
  updateMemberAccountStatus,
  updateMyMemberProfile,
  updateWoredaMember,
  type MemberFormOptions,
  type MemberPayload,
  type WoredaMember,
  type WoredaMembersPagination,
  type WoredaMembersQuery,
  type WoredaMembersSummary,
} from "./woredaMemberService";

export type {
  MemberFormOptions,
  MemberPayload,
  WoredaMember,
  WoredaMembersPagination,
  WoredaMembersQuery,
  WoredaMembersSummary,
};

export {
  getMemberFormOptions,
  getMemberFilterOptions,
  getMyMemberProfile,
  updateMyMemberProfile,
  createMemberAccount,
  resendMemberSetup,
  updateMemberAccountStatus,
  bulkCreateMemberAccounts,
};

export function getMembers(query: WoredaMembersQuery = {}) {
  return getWoredaMembers(query);
}

export function getMember(memberId: string) {
  return getWoredaMember(memberId);
}

export function createMember(payload: MemberPayload) {
  return createWoredaMember(payload);
}

export function updateMember(memberId: string, payload: MemberPayload) {
  return updateWoredaMember(memberId, payload);
}

