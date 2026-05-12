import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  ImageIcon,
  List,
  Mail,
  PieChart,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, AUTH_TOKEN_KEY } from "../../../services/apiClient";
import { MemberImportDrawer } from "../../woreda/members/MemberImportDrawer";
import { Button } from "@/components/ui/shadcn/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/shadcn/sheet";


const API_BASE_URL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function memberPhotoUrl(photoFileId?: string | null) {
  if (!photoFileId) return "";
  const token = getStoredAuthToken();
  const query = token ? `?inline=true&token=${encodeURIComponent(token)}` : "?inline=true";
  return `${API_BASE_URL}/files/${photoFileId}/download${query}`;
}


type MemberRecord = {
  id: string;
  memberCode?: string | null;
  fanId?: string | null;
  ppId?: string | null;
  firstName?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  hibretId?: string | null;
  familyId?: string | null;
  membershipStatus?: string | null;
  registrationType?: string | null;
  membershipYear?: number | string | null;
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
  hibretName?: string | null;
  familyName?: string | null;
  hibret?: { id?: string | null; name?: string | null } | null;
  family?: { id?: string | null; name?: string | null } | null;
};

type HibretRecord = {
  id: string;
  name: string;
};

type MembersResponse = {
  members?: MemberRecord[];
  data?: MemberRecord[];
  items?: MemberRecord[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type MembersRegistryPageProps = {
  title?: string;
  subtitle?: string;
  memberDetailBasePath?: string;
  scopeHibretId?: string;
  showHibretFilter?: boolean;
  showAddButton?: boolean;
  showImportButton?: boolean;
  /** Renders inside the control bar before the search field (e.g. back link + tabs). */
  controlBarLeading?: ReactNode;
};

type MemberActionModal = "add" | null;

type MemberForm = {
  memberCode: string;
  fanId: string;
  ppId: string;
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  hibretId: string;
  familyId: string;
  membershipStatus: string;
  registrationType: string;
  membershipYear: string;
  partyRole: string;
  educationLevel: string;
  fieldOfStudy: string;
  workplace: string;
  workType: string;
  workExperienceYears: string;
  zone: string;
  kebele: string;
  ethnicity: string;
  healthStatus: string;
  photoFileId: string;
};

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type FilterGroup = {
  key: string;
  label: string;
  options: FilterOption[];
};


const blankMemberForm: MemberForm = {
  memberCode: "",
  fanId: "",
  ppId: "",
  firstName: "",
  fatherName: "",
  grandfatherName: "",
  gender: "ወንድ",
  dateOfBirth: "",
  phone: "",
  email: "",
  hibretId: "",
  familyId: "",
  membershipStatus: "ዕጩ አባል",
  registrationType: "እንደ አዲስ የተመዘገበ",
  membershipYear: "",
  partyRole: "",
  educationLevel: "",
  fieldOfStudy: "",
  workplace: "",
  workType: "የመንግስት ሰራተኛ",
  workExperienceYears: "",
  zone: "",
  kebele: "",
  ethnicity: "",
  healthStatus: "ጤነኛ",
  photoFileId: "",
};

function textValue(value?: string | number | null) {
  return String(value ?? "").trim();
}

function lowerValue(value?: string | number | null) {
  return textValue(value).toLowerCase();
}

function extractMembers(payload: MembersResponse | MemberRecord[]) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.members)) return payload.members;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function extractHibrets(payload: unknown): HibretRecord[] {
  const value = payload as { hibrets?: HibretRecord[]; items?: HibretRecord[]; data?: HibretRecord[] } | HibretRecord[];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.hibrets)) return value.hibrets;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  return [];
}

function fullName(member: MemberRecord) {
  return [member.firstName, member.fatherName, member.grandfatherName]
    .map(textValue)
    .filter(Boolean)
    .join(" ");
}

function initials(member: MemberRecord) {
  return [member.firstName, member.fatherName]
    .map(textValue)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
}

function hibretName(member: MemberRecord) {
  return textValue(member.hibret?.name) || textValue(member.hibretName) || "-";
}

function ppDisplay(member: MemberRecord) {
  return textValue(member.ppId) || "-";
}

/** Kanban strip: `PP/15590` style (digits only after slash when possible). */
function ppKanbanLine(member: MemberRecord) {
  const raw = textValue(member.ppId);
  if (!raw || raw === "-") return "PP/—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) return `PP/${digits}`;
  return `PP/${raw}`;
}

function fanDisplay(member: MemberRecord) {
  const value = textValue(member.fanId);
  if (!value) return "-";

  const digits = value.replace(/\D/g, "");
  if (digits.length === 16) {
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }

  return value;
}

function normalizeGender(value?: string | null) {
  const clean = lowerValue(value);
  if (clean === "male") return "ወንድ";
  if (clean === "female") return "ሴት";
  return textValue(value) || "-";
}

function normalizeMember(member: MemberRecord): MemberRecord {
  return {
    ...member,
    hibret:
      member.hibret ??
      (member.hibretId || member.hibretName
        ? { id: member.hibretId ?? "", name: member.hibretName ?? "Unassigned Hibret" }
        : null),
    family:
      member.family ??
      (member.familyId || member.familyName
        ? { id: member.familyId ?? "", name: member.familyName ?? "Unassigned Family" }
        : null),
  };
}


function numericOrUndefined(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  return Number.isNaN(parsed) ? undefined : parsed;
}



async function uploadMemberPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ file: { id: string } }>("/files/upload/member", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.file.id;
}

export function MembersRegistryPage({
  title = "Members",
  subtitle,
  memberDetailBasePath = "/woreda/members",
  scopeHibretId,
  showHibretFilter = true,
  showAddButton = true,
  showImportButton = true,
  controlBarLeading,
}: MembersRegistryPageProps) {
  void subtitle;

  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLElement | null>(null);

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [hibrets, setHibrets] = useState<HibretRecord[]>([]);
  const [filterCounts, setFilterCounts] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [memberActionModal, setMemberActionModal] = useState<MemberActionModal>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberForm>({
    ...blankMemberForm,
    hibretId: scopeHibretId ?? "",
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chartsInitialized, setChartsInitialized] = useState(false);

  async function loadAnalytics() {
    if (!showAnalytics) return;
    
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (scopeHibretId) params.set("hibretId", scopeHibretId);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await apiClient.get(`/members/analytics?${params.toString()}`);
      setAnalyticsData(response.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }


  async function initializeCharts() {
    if (!analyticsData || chartsInitialized) return;

    try {
      // Dynamic import for Chart.js
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const styles = getComputedStyle(document.documentElement);
      const token = (name: string, fallback = "#00658D") =>
        styles.getPropertyValue(name).trim() || fallback;
      const isSmallScreen = window.innerWidth < 640;
      const guideLegend = {
        display: !isSmallScreen,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: isSmallScreen ? 8 : 15,
          font: { size: isSmallScreen ? 10 : 12 },
        },
      };
      const guideTicks = {
        maxTicksLimit: isSmallScreen ? 4 : 8,
        font: { size: isSmallScreen ? 10 : 12 },
      };

      // Clean up existing charts
      Chart.getChart('genderChart')?.destroy();
      Chart.getChart('statusChart')?.destroy();
      Chart.getChart('educationChart')?.destroy();
      Chart.getChart('ageChart')?.destroy();

      // Gender Distribution (Pie Chart)
      if (analyticsData.gender && analyticsData.gender.length > 0) {
        const genderCtx = document.getElementById('genderChart') as HTMLCanvasElement;
        if (genderCtx) {
          new Chart(genderCtx, {
            type: 'doughnut',
            data: {
              labels: analyticsData.gender.map((g: any) => g.gender === 'male' ? 'Male' : 'Female'),
              datasets: [{
                data: analyticsData.gender.map((g: any) => g._count),
                backgroundColor: [token('--aw-primary', '#00658D'), token('--aw-success', '#0d6e4d')],
                borderWidth: 0,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: guideLegend
              }
            }
          });
        }
      }

      // Member Status (Pie Chart)
      if (analyticsData.membershipStatus && analyticsData.membershipStatus.length > 0) {
        const statusCtx = document.getElementById('statusChart') as HTMLCanvasElement;
        if (statusCtx) {
          new Chart(statusCtx, {
            type: 'doughnut',
            data: {
              labels: analyticsData.membershipStatus.map((s: any) => s.membershipStatus),
              datasets: [{
                data: analyticsData.membershipStatus.map((s: any) => s._count),
                backgroundColor: [token('--aw-success', '#0d6e4d'), token('--aw-warning', '#8a6d00'), token('--aw-danger', '#ba1a1a'), token('--aw-primary-soft', '#e6f3f8')],
                borderWidth: 0,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: guideLegend
              }
            }
          });
        }
      }

      // Education Level (Bar Chart)
      if (analyticsData.educationLevel && analyticsData.educationLevel.length > 0) {
        const educationCtx = document.getElementById('educationChart') as HTMLCanvasElement;
        if (educationCtx) {
          new Chart(educationCtx, {
            type: 'bar',
            data: {
              labels: analyticsData.educationLevel.map((e: any) => e.educationLevel),
              datasets: [{
                data: analyticsData.educationLevel.map((e: any) => e._count),
                backgroundColor: token('--aw-primary', '#00658D'),
                borderRadius: 4,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { display: false },
                  ticks: guideTicks
                },
                x: {
                  grid: { display: false },
                  ticks: { ...guideTicks, maxRotation: isSmallScreen ? 0 : 45 }
                }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });
        }
      }

      // Age Groups (Bar Chart)
      if (analyticsData.ageGroups && analyticsData.ageGroups.length > 0) {
        const ageCtx = document.getElementById('ageChart') as HTMLCanvasElement;
        if (ageCtx) {
          new Chart(ageCtx, {
            type: 'bar',
            data: {
              labels: analyticsData.ageGroups.map((a: any) => a.ageGroup),
              datasets: [{
                data: analyticsData.ageGroups.map((a: any) => a.count),
                backgroundColor: token('--aw-success', '#0d6e4d'),
                borderRadius: 4,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { display: false },
                  ticks: guideTicks
                },
                x: {
                  grid: { display: false },
                  ticks: guideTicks
                }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });
        }
      }

            setChartsInitialized(true);
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }

  async function loadMembers() {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());
      params.set("limit", pageSize.toString());
      
      // Add filters to query - map frontend filter keys to backend parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          // Map frontend filter keys to backend parameter names
          if (key === 'fanStatus') {
            params.set('fanStatus', value);
          } else {
            params.set(key, value);
          }
        }
      });
      
      // Add search query
      if (debouncedQuery) {
        params.set("search", debouncedQuery);
      }
      
      if (scopeHibretId) params.set("hibretId", scopeHibretId);

      const response = await apiClient.get<MembersResponse | MemberRecord[]>(`/members?${params.toString()}`);
      const data = response.data;
      
      if (Array.isArray(data)) {
        setMembers(data.map(normalizeMember));
        setTotalCount(data.length);
      } else {
        const members = extractMembers(data);
        setMembers(members.map(normalizeMember));
        setTotalCount(data.pagination?.total || members.length);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to load members.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHibrets() {
    try {
      const response = await apiClient.get("/hibrets");
      setHibrets(extractHibrets(response.data));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFilterCounts() {
    try {
      const params = new URLSearchParams();
      
      // Add current search and scope to get accurate counts
      if (debouncedQuery) {
        params.set("search", debouncedQuery);
      }
      if (scopeHibretId) {
        params.set("hibretId", scopeHibretId);
      }

      // Try new endpoint first, fallback to existing endpoint
      let response;
      try {
        response = await apiClient.get<{
          gender: Record<string, number>;
          fanStatus: Record<string, number>;
          workType: Record<string, number>;
          educationLevel: Record<string, number>;
          healthStatus: Record<string, number>;
          membershipStatus: Record<string, number>;
          registrationType: Record<string, number>;
          hibret: Record<string, number>;
          total: number;
        }>(`/members/filter-counts?${params.toString()}`);
      } catch (filterCountsError) {
        console.log('Filter-counts endpoint not available, trying filter-options:', filterCountsError);
        // Fallback to existing filter-options endpoint
        const optionsResponse = await apiClient.get(`/members/filter-options?${params.toString()}`);
        const options = optionsResponse.data.options || optionsResponse.data;
        
        // Transform filter-options format to filter-counts format
        const transformedData: any = {
          total: options.total || 1928,
        };
        
        if (options.gender) {
          transformedData.gender = {};
          options.gender.forEach((item: any) => {
            transformedData.gender[item.value] = item.count;
          });
        }
        
        if (options.faydaStatus) {
          transformedData.fanStatus = {};
          options.faydaStatus.forEach((item: any) => {
            const key = item.value === 'registered' ? 'registered' : 'not-registered';
            transformedData.fanStatus[key] = item.count;
          });
        }
        
        if (options.workType) {
          transformedData.workType = {};
          options.workType.forEach((item: any) => {
            transformedData.workType[item.value] = item.count;
          });
        }
        
        if (options.educationLevel) {
          transformedData.educationLevel = {};
          options.educationLevel.forEach((item: any) => {
            transformedData.educationLevel[item.value] = item.count;
          });
        }
        
        if (options.healthStatus) {
          transformedData.healthStatus = {};
          options.healthStatus.forEach((item: any) => {
            transformedData.healthStatus[item.value] = item.count;
          });
        }
        
        if (options.membershipStatus) {
          transformedData.membershipStatus = {};
          options.membershipStatus.forEach((item: any) => {
            transformedData.membershipStatus[item.value] = item.count;
          });
        }
        
        if (options.hibrets) {
          transformedData.hibret = {};
          options.hibrets.forEach((item: any) => {
            transformedData.hibret[item.value] = item.count;
          });
        }
        
        response = { data: transformedData };
      }

      const { total: _total, ...filterData } = response.data;
      console.log('Filter counts received:', filterData);
      console.log('Full response:', response.data);
      setFilterCounts(filterData);
    } catch (err) {
      console.error("Failed to load filter counts:", err);
      console.log('Error details:', (err as any).response?.data || (err as Error).message);
      // Remove fallback data to see real API behavior
      setFilterCounts({});
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadMembers();
  }, [page, pageSize, filters, debouncedQuery, scopeHibretId]);

  useEffect(() => {
    loadHibrets();
  }, []);

  useEffect(() => {
    loadFilterCounts();
  }, [debouncedQuery, scopeHibretId]); // Load filter counts when search or scope changes

  // Missing dependency: loadFilterCounts should also reload when filters change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      loadFilterCounts();
    }
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters]);

  useEffect(() => {
    if (showAnalytics) {
      loadAnalytics();
    } else {
      setChartsInitialized(false);
    }
  }, [showAnalytics, debouncedQuery, filters, scopeHibretId]);

  useEffect(() => {
    if (analyticsData && showAnalytics) {
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => {
        initializeCharts();
      }, 100);
    }
  }, [analyticsData, showAnalytics]);

  // Cleanup charts when component unmounts or analytics closes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        import('chart.js').then(({ Chart }) => {
          Chart.getChart('genderChart')?.destroy();
          Chart.getChart('statusChart')?.destroy();
          Chart.getChart('educationChart')?.destroy();
          Chart.getChart('ageChart')?.destroy();
            }).catch(() => {
          // Chart.js not loaded, no cleanup needed
        });
      }
    };
  }, []);

  useEffect(() => {
    if (memberActionModal === "add") {
      setMemberForm({
        ...blankMemberForm,
        hibretId: scopeHibretId ?? "",
      });
    }
  }, [memberActionModal, scopeHibretId]);

  useEffect(() => {
    const host = rootRef.current?.closest(".aw-admin-page");
    const contentHost = rootRef.current?.closest(".aw-admin-content");
    if (!host) return;

    host.classList.add("aw-admin-page--member-registry-lock");
    contentHost?.classList.add("aw-admin-content--member-registry-lock");
    return () => {
      host.classList.remove("aw-admin-page--member-registry-lock");
      contentHost?.classList.remove("aw-admin-content--member-registry-lock");
    };
  }, []);

  function setFilter(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    // Auto-close mobile filters after selection
    if (window.innerWidth <= 768) {
      setMobileFiltersOpen(false);
    }
  }

  function updateMemberForm(key: keyof MemberForm, value: string) {
    setMemberForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePhotoUpload(file?: File | null) {
    if (!file) return;

    setSaving(true);

    try {
      const fileId = await uploadMemberPhoto(file);
      updateMemberForm("photoFileId", fileId);
      toast.success("Member photo uploaded.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to upload member photo.");
    } finally {
      setSaving(false);
    }
  }


  // With server-side pagination, we don't need client-side filtering

  // Server-side pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalCount, safePage * pageSize);
  const visibleMembers = members; // All members are already the current page

  const filterGroups = useMemo(() => {
    const groups: FilterGroup[] = [];

    // Gender filter
    if (filterCounts.gender) {
      const genderOptions = Object.entries(filterCounts.gender)
        .map(([value, count]) => ({ 
          value, 
          label: value === "ወንድ" ? "ወንድ" : value === "ሴት" ? "ሴት" : value, 
          count 
        }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (genderOptions.length > 0) {
        groups.push({
          key: "gender",
          label: "ጾታ",
          options: genderOptions,
        });
      }
    }

    // Fayda Status filter
    if (filterCounts.fanStatus) {
      const fanStatusOptions = [];
      if (filterCounts.fanStatus.registered) {
        fanStatusOptions.push({ 
          value: "registered", 
          label: "Fayda Registered", 
          count: filterCounts.fanStatus.registered 
        });
      }
      if (filterCounts.fanStatus["not-registered"]) {
        fanStatusOptions.push({ 
          value: "not-registered", 
          label: "Fayda Not Registered", 
          count: filterCounts.fanStatus["not-registered"] 
        });
      }
      
      if (fanStatusOptions.length > 0) {
        groups.push({
          key: "fanStatus",
          label: "Fayda Status",
          options: fanStatusOptions.sort((a, b) => b.count - a.count),
        });
      }
    }

    // Work Type filter
    if (filterCounts.workType) {
      const workTypeOptions = Object.entries(filterCounts.workType)
        .map(([value, count]) => ({ value, label: value, count }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (workTypeOptions.length > 0) {
        groups.push({
          key: "workType",
          label: "የህብረተሰብ ክፍል",
          options: workTypeOptions,
        });
      }
    }

    // Education Level filter
    if (filterCounts.educationLevel) {
      const educationOptions = Object.entries(filterCounts.educationLevel)
        .map(([value, count]) => ({ value, label: value, count }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (educationOptions.length > 0) {
        groups.push({
          key: "educationLevel",
          label: "የት/ት ደረጃ",
          options: educationOptions,
        });
      }
    }

    // Health Status filter
    if (filterCounts.healthStatus) {
      const healthOptions = Object.entries(filterCounts.healthStatus)
        .map(([value, count]) => ({ value, label: value, count }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (healthOptions.length > 0) {
        groups.push({
          key: "healthStatus",
          label: "የጤንነት ሁኔታ",
          options: healthOptions,
        });
      }
    }

    // Registration Type filter
    if (filterCounts.registrationType) {
      const registrationOptions = Object.entries(filterCounts.registrationType)
        .map(([value, count]) => ({ value, label: value, count }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (registrationOptions.length > 0) {
        groups.push({
          key: "registrationType",
          label: "የምዝገባው አይነት",
          options: registrationOptions,
        });
      }
    }

    // Membership Status filter
    if (filterCounts.membershipStatus) {
      const membershipOptions = Object.entries(filterCounts.membershipStatus)
        .map(([value, count]) => ({ value, label: value, count }))
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count);
      
      if (membershipOptions.length > 0) {
        groups.push({
          key: "membershipStatus",
          label: "አሁን ያለበት ሁኔታ",
          options: membershipOptions,
        });
      }
    }

    // Hibret filter
    if (showHibretFilter && filterCounts.hibret) {
      const hibretOptions = Object.entries(filterCounts.hibret)
        .map(([id, count]) => {
          const hibret = hibrets.find(h => h.id === id);
          return { 
            value: id, 
            label: hibret?.name || id, 
            count 
          };
        })
        .filter(option => option.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      
      if (hibretOptions.length > 0) {
        groups.push({
          key: "hibret",
          label: "Hibret",
          options: hibretOptions,
        });
      }
    }

    return groups;
  }, [filterCounts, hibrets, showHibretFilter]);

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        memberCode: memberForm.memberCode || memberForm.ppId || undefined,
        fanId: memberForm.fanId || undefined,
        ppId: memberForm.ppId || undefined,
        firstName: memberForm.firstName,
        fatherName: memberForm.fatherName,
        grandfatherName: memberForm.grandfatherName,
        gender: memberForm.gender || undefined,
        dateOfBirth: memberForm.dateOfBirth || undefined,
        phone: memberForm.phone || undefined,
        email: memberForm.email || undefined,
        hibretId: scopeHibretId || memberForm.hibretId || undefined,
        familyId: memberForm.familyId || undefined,
        membershipStatus: memberForm.membershipStatus || undefined,
        registrationType: memberForm.registrationType || undefined,
        membershipYear: numericOrUndefined(memberForm.membershipYear),
        partyRole: memberForm.partyRole || undefined,
        educationLevel: memberForm.educationLevel || undefined,
        fieldOfStudy: memberForm.fieldOfStudy || undefined,
        workplace: memberForm.workplace || undefined,
        workType: memberForm.workType || undefined,
        workExperienceYears: numericOrUndefined(memberForm.workExperienceYears),
        zone: memberForm.zone || undefined,
        kebele: memberForm.kebele || undefined,
        ethnicity: memberForm.ethnicity || undefined,
        healthStatus: memberForm.healthStatus || undefined,
        photoFileId: memberForm.photoFileId || undefined,
      };

      await apiClient.post("/members", payload);
      toast.success("Member created.");
      setMemberActionModal(null);
      await loadMembers();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Unable to create member.");
    } finally {
      setSaving(false);
    }
  }

  function openMember(memberId: string) {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`${memberDetailBasePath}/${memberId}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <section
      ref={rootRef}
      className="aw-design-page member-registry-page aw-member-registry flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="member-registry-control-bar">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {controlBarLeading}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="member-mobile-filter-toggle"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-filters"
          >
            Filters
            {mobileFiltersOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          </Button>
          <div className="member-registry-search">
            <Search size={17} aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, PP, FAN, phone..."
            />
          </div>
        </div>

        <div className="member-registry-actions">
          <span className="member-registry-count">{start}-{end} / {totalCount}</span>

          <select
            className="member-page-size-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={80}>80 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <Button
            type="button"
            variant={viewMode === "cards" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setViewMode("cards")}
            title="Kanban view"
            aria-label="Kanban view"
          >
            <Grid3X3 aria-hidden />
          </Button>

          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setViewMode("table")}
            title="List view"
            aria-label="List view"
          >
            <List aria-hidden />
          </Button>

          <div className="member-pagination-controls">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>

            <span className="member-page-info">
              Page {safePage} of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>

          {showImportButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload aria-hidden />
              Import
            </Button>
          ) : null}

          <Button
            type="button"
            variant={showAnalytics ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 aria-hidden />
            Analytics
          </Button>

          {showAddButton ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setMemberActionModal("add")}
            >
              <UserPlus aria-hidden />
              Add member
            </Button>
          ) : null}
        </div>
      </div>

      {/* Embedded Analytics Section */}
      {showAnalytics && (
        <div className="member-analytics-embedded">
          {analyticsLoading ? (
            <div className="analytics-loading">
              <div className="loading-spinner"></div>
              Loading analytics...
            </div>
          ) : analyticsData ? (
            <div className="analytics-content">
              {/* Analytics Header with Expand Button */}
              <div className="analytics-header">
                <h3>Member Analytics</h3>
              </div>
              {/* Summary Stats */}
              <div className="analytics-summary-stats">
                <div className="stat-card">
                  <span className="stat-value">{analyticsData.total?.toLocaleString() || '0'}</span>
                  <span className="stat-label">Total Members</span>
                </div>
                
                {analyticsData.gender && (
                  <>
                    <div className="stat-card">
                      <span className="stat-value">
                        {analyticsData.gender.find((g: any) => g.gender === 'male')?._count?.toLocaleString() || '0'}
                      </span>
                      <span className="stat-label">Male ({analyticsData.total > 0 ? Math.round(((analyticsData.gender.find((g: any) => g.gender === 'male')?._count || 0) / analyticsData.total) * 100) : 0}%)</span>
                    </div>
                    
                    <div className="stat-card">
                      <span className="stat-value">
                        {analyticsData.gender.find((g: any) => g.gender === 'female')?._count?.toLocaleString() || '0'}
                      </span>
                      <span className="stat-label">Female ({analyticsData.total > 0 ? Math.round(((analyticsData.gender.find((g: any) => g.gender === 'female')?._count || 0) / analyticsData.total) * 100) : 0}%)</span>
                    </div>
                  </>
                )}

                <div className="stat-card">
                  <span className="stat-value">{analyticsData.fanRegistered?.toLocaleString() || '0'}</span>
                  <span className="stat-label">FAN Registered ({analyticsData.total > 0 ? Math.round(((analyticsData.fanRegistered || 0) / analyticsData.total) * 100) : 0}%)</span>
                </div>

                {analyticsData.healthStatus && (
                  <div className="stat-card">
                    <span className="stat-value">
                      {analyticsData.healthStatus.find((h: any) => h.healthStatus === 'አካል ጉዳተኛ')?._count || '0'}
                    </span>
                    <span className="stat-label">With Disability ({analyticsData.total > 0 ? (((analyticsData.healthStatus.find((h: any) => h.healthStatus === 'አካል ጉዳተኛ')?._count || 0) / analyticsData.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                )}
              </div>

              {/* Charts Grid */}
              <div className="analytics-charts-grid">
                {/* Gender Distribution */}
                {analyticsData.gender && analyticsData.gender.length > 0 && (
                  <div className="analytics-chart-card">
                    <h4><PieChart size={16} /> Gender Distribution</h4>
                    <div className="chart-container">
                      <canvas id="genderChart"></canvas>
                    </div>
                  </div>
                )}

                {/* Member Status */}
                {analyticsData.membershipStatus && analyticsData.membershipStatus.length > 0 && (
                  <div className="analytics-chart-card">
                    <h4><PieChart size={16} /> Member Status</h4>
                    <div className="chart-container">
                      <canvas id="statusChart"></canvas>
                    </div>
                  </div>
                )}

                {/* Education Level */}
                {analyticsData.educationLevel && analyticsData.educationLevel.length > 0 && (
                  <div className="analytics-chart-card">
                    <h4><BarChart3 size={16} /> Education Level</h4>
                    <div className="chart-container">
                      <canvas id="educationChart"></canvas>
                    </div>
                  </div>
                )}

                {/* Age Distribution */}
                {analyticsData.ageGroups && analyticsData.ageGroups.length > 0 && (
                  <div className="analytics-chart-card">
                    <h4><BarChart3 size={16} /> Age Distribution</h4>
                    <div className="chart-container">
                      <canvas id="ageChart"></canvas>
                    </div>
                  </div>
                )}

                {/* Members by Hibret - only for unscoped (Woreda-level) views */}
              </div>
            </div>
          ) : (
            <div className="analytics-empty">
              <div className="analytics-empty-icons">
                <BarChart3 size={20} />
                <PieChart size={20} />
              </div>
              <p>View member insights with charts and statistics</p>
            </div>
          )}
        </div>
      )}

      <div className="member-registry-layout">
        <aside className={`member-filter-sidebar ${mobileFiltersOpen ? 'member-filter-sidebar--mobile-open' : ''}`} id="mobile-filters">
          {filterGroups.length === 0 && (
            <div className="p-5 text-center text-woreda-textMuted">
              {Object.keys(filterCounts).length === 0 ? 'Loading filters...' : 'No filters available'}
            </div>
          )}
          {filterGroups.map((group) => (
            <section className="member-filter-group" key={group.key}>
              <h3>{group.label}</h3>

              <button type="button" className={!filters[group.key] ? "is-active" : ""} onClick={() => setFilter(group.key, "")}>
                <span>All</span>
                <strong>{totalCount}</strong>
              </button>

              {group.options.map((option) => (
                <button type="button" key={option.value} className={filters[group.key] === option.value ? "is-active" : ""} onClick={() => setFilter(group.key, option.value)}>
                  <span>{option.label}</span>
                  <strong>{option.count}</strong>
                </button>
              ))}
            </section>
          ))}
        </aside>

        <main className="member-registry-results">
          {loading ? (
            <div className="member-registry-empty">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="member-registry-empty">
              <h2>No members found</h2>
              <p>Adjust the search text or filters.</p>
            </div>
          ) : viewMode === "cards" ? (
            <div className="member-card-grid">
              {visibleMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className="member-kanban-card"
                  aria-label={fullName(member) ? `Open member ${fullName(member)}` : "Open member"}
                  onClick={() => openMember(member.id)}
                >
                  <div className="member-kanban-photo">
                    {member.photoFileId ? (
                      <img src={memberPhotoUrl(member.photoFileId)} alt="" />
                    ) : (
                      <span className="member-kanban-initials">{initials(member)}</span>
                    )}
                  </div>
                  <div className="member-kanban-main">
                    <h3 className="member-kanban-name">{fullName(member) || "Unnamed member"}</h3>
                    {textValue(member.email) ? (
                      <div className="member-kanban-email-row">
                        <Mail size={15} strokeWidth={2.25} className="member-kanban-email-icon" aria-hidden />
                      </div>
                    ) : null}
                    <p className="member-kanban-pp">{ppKanbanLine(member)}</p>
                    <div className="member-kanban-fan-row">
                      <span className="member-kanban-fan-logo-wrap">
                        <img src="/Prosperity_Party_logo.png" alt="" />
                      </span>
                      <span
                        className={
                          textValue(member.fanId)
                            ? "member-kanban-fan-digits"
                            : "member-kanban-fan-digits member-kanban-fan-digits--muted"
                        }
                      >
                        {fanDisplay(member)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="member-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>PP</th>
                    <th>FAN Formatted</th>
                    <th>ጾታ</th>
                    <th>የአባል ስም</th>
                    <th>የአባት ስም</th>
                    <th>የአያት ስም</th>
                    <th>Hibret</th>
                    <th>Member Code</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => (
                    <tr key={member.id} onClick={() => openMember(member.id)} className="cursor-pointer">
                      <td>
                        <div className="member-table-photo">
                          {member.photoFileId ? (
                            <img src={memberPhotoUrl(member.photoFileId)} alt={fullName(member) || "Member photo"} />
                          ) : (
                            <span>{initials(member)}</span>
                          )}
                        </div>
                      </td>
                      <td className="member-pp-cell">{ppDisplay(member)}</td>
                      <td>{fanDisplay(member)}</td>
                      <td>{normalizeGender(member.gender)}</td>
                      <td>{textValue(member.firstName) || "-"}</td>
                      <td>{textValue(member.fatherName) || "-"}</td>
                      <td>{textValue(member.grandfatherName) || "-"}</td>
                      <td>{hibretName(member)}</td>
                      <td>{textValue(member.memberCode) || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <Sheet
        open={memberActionModal !== null}
        onOpenChange={(open) => {
          if (!open) setMemberActionModal(null);
        }}
      >
        <SheetContent
          side="right"
          className="member-action-drawer flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetDescription>{title}</SheetDescription>
            <SheetTitle>Add member</SheetTitle>
          </SheetHeader>
          {memberActionModal === "add" ? (
            <form className="member-action-body member-form-grid" onSubmit={saveMember}>
                <label className="member-form-field member-photo-upload member-form-full">
                  Photo
                  <div className="member-photo-upload-row">
                    <div className="member-photo-upload-preview">
                      {memberForm.photoFileId ? (
                        <img src={memberPhotoUrl(memberForm.photoFileId)} alt="Member preview" />
                      ) : (
                        <ImageIcon size={24} />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handlePhotoUpload(event.currentTarget.files?.[0])}
                      />
                      <p>Upload a member profile photo.</p>
                    </div>
                  </div>
                </label>

                <FormInput label="PP" value={memberForm.ppId} onChange={(value) => updateMemberForm("ppId", value)} placeholder="PP/00000000" required />
                <FormInput label="FAN" value={memberForm.fanId} onChange={(value) => updateMemberForm("fanId", value)} placeholder="0000 0000 0000 0000" />
                <FormInput label="Member Code" value={memberForm.memberCode} onChange={(value) => updateMemberForm("memberCode", value)} placeholder="Member code" />

                <label className="member-form-field">
                  Gender
                  <select value={memberForm.gender} onChange={(event) => updateMemberForm("gender", event.target.value)}>
                    <option value="ወንድ">ወንድ</option>
                    <option value="ሴት">ሴት</option>
                    <option value="male">male</option>
                    <option value="female">female</option>
                  </select>
                </label>

                <FormInput label="First Name" value={memberForm.firstName} onChange={(value) => updateMemberForm("firstName", value)} required />
                <FormInput label="Father Name" value={memberForm.fatherName} onChange={(value) => updateMemberForm("fatherName", value)} required />
                <FormInput label="Grandfather Name" value={memberForm.grandfatherName} onChange={(value) => updateMemberForm("grandfatherName", value)} required />

                {scopeHibretId ? (
                  <label className="member-form-field">
                    Hibret
                    <input
                      value={hibrets.find((hibret) => hibret.id === scopeHibretId)?.name || "Current Hibret"}
                      readOnly
                      className="cursor-not-allowed opacity-80"
                    />
                  </label>
                ) : (
                  <label className="member-form-field">
                    Hibret
                    <select value={memberForm.hibretId} onChange={(event) => updateMemberForm("hibretId", event.target.value)}>
                      <option value="">Select Hibret</option>
                      {hibrets.map((hibret) => (
                        <option value={hibret.id} key={hibret.id}>{hibret.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <FormInput label="Date of Birth" type="date" value={memberForm.dateOfBirth} onChange={(value) => updateMemberForm("dateOfBirth", value)} />
                <FormInput label="Phone" value={memberForm.phone} onChange={(value) => updateMemberForm("phone", value)} />
                <FormInput label="Email" type="email" value={memberForm.email} onChange={(value) => updateMemberForm("email", value)} />
                <FormInput label="Membership Year" type="number" value={memberForm.membershipYear} onChange={(value) => updateMemberForm("membershipYear", value)} />
                <FormInput label="Party Role" value={memberForm.partyRole} onChange={(value) => updateMemberForm("partyRole", value)} />
                <FormInput label="Education Level" value={memberForm.educationLevel} onChange={(value) => updateMemberForm("educationLevel", value)} />
                <FormInput label="Field of Study" value={memberForm.fieldOfStudy} onChange={(value) => updateMemberForm("fieldOfStudy", value)} />
                <FormInput label="Workplace" value={memberForm.workplace} onChange={(value) => updateMemberForm("workplace", value)} />
                <FormInput label="Work Type" value={memberForm.workType} onChange={(value) => updateMemberForm("workType", value)} />
                <FormInput label="Work Experience Years" type="number" value={memberForm.workExperienceYears} onChange={(value) => updateMemberForm("workExperienceYears", value)} />
                <FormInput label="Zone" value={memberForm.zone} onChange={(value) => updateMemberForm("zone", value)} />
                <FormInput label="Kebele" value={memberForm.kebele} onChange={(value) => updateMemberForm("kebele", value)} />
                <FormInput label="Ethnicity" value={memberForm.ethnicity} onChange={(value) => updateMemberForm("ethnicity", value)} />
                <FormInput label="Health Status" value={memberForm.healthStatus} onChange={(value) => updateMemberForm("healthStatus", value)} />
                <FormInput label="Registration Type" value={memberForm.registrationType} onChange={(value) => updateMemberForm("registrationType", value)} />
                <FormInput label="Membership Status" value={memberForm.membershipStatus} onChange={(value) => updateMemberForm("membershipStatus", value)} />

              <div className="member-drawer-actions member-form-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMemberActionModal(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save member"}
                </Button>
              </div>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
      <MemberImportDrawer
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={loadMembers}
      />

    </section>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="member-form-field">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default MembersRegistryPage;
