export type MemberSummaryRow = {
  id: string;
  name: string;
  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
  gender: string;
  phone?: string | null;
  email?: string | null;
  hibretId: string;
  hibretName?: string | null;
  familyId?: string | null;
  familyName?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  memberCode?: string | null;
  membershipStatus?: string | null;
  account?: { status: string; email: string } | null;
};

