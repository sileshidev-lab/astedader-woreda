import { apiClient } from "./apiClient";

export type DashboardSummary = {
  hibrets: number;
  members: number;
  activeMembers: number;
  candidateMembers: number;
  maleMembers: number;
  femaleMembers: number;
  unknownGenderMembers: number;
  directives: number;
  publishedDirectives: number;
  closedDirectives: number;
  totalTargets: number;
  totalReports: number;
  submissionRate: number;
  attendanceExpected: number;
  attendanceMarked: number;
  attendancePresent: number;
  attendanceCompletionRate: number;
  attendancePresentRate: number;
  latestFiveAttendance: {
    directiveCount: number;
    expected: number;
    marked: number;
    present: number;
    absent: number;
    excused: number;
    unmarked: number;
    completionRate: number;
    presentRate: number;
  };
  educationDistribution?: Record<string, number>;
  ageDistribution?: {
    "18-30": number;
    "31-45": number;
    "46+": number;
    Unknown: number;
  };
};

export type HibretPerformanceRow = {
  id: string;
  name: string;
  memberCount: number;
  targetedDirectives: number;
  submittedReports: number;
  pendingReports: number;
  attendanceRequiredDirectives: number;
  attendanceExpected: number;
  attendanceMarked: number;
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceExcused: number;
  reportSubmissionRate: number;
  attendanceCompletionRate: number;
  attendancePresentRate: number;
  attendanceScore: number;
  performanceScore: number;
};

export type WoredaDashboardData = {
  summary: DashboardSummary;
  hibretPerformance: HibretPerformanceRow[];
  recentDirectives: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    deadline: string | null;
    targetCount: number;
    reportCount: number;
  }>;
};

export async function getWoredaDashboardData(): Promise<WoredaDashboardData> {
  const response = await apiClient.get<WoredaDashboardData>("/woreda/dashboard");
  return response.data;
}
