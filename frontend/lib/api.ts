const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; admin_id: string; admin_email: string; admin_name: string; admin_role: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  me: () => request<{ id: string; email: string; name: string; role: string }>("/api/auth/me"),
};

// ── Projects ────────────────────────────────────────────────────────
export const projects = {
  list: () => request<Project[]>("/api/projects"),
  listOpen: () => request<Project[]>("/api/projects/open"),
  get: (id: string) => request<Project>(`/api/projects/${id}`),
  create: (data: Partial<Project>) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Registration ────────────────────────────────────────────────────
export const registration = {
  submit: (formData: FormData) =>
    fetch(`${API_BASE}/api/register`, {
      method: "POST",
      body: formData,
      headers: getAuthHeaders(),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Registration failed");
      }
      return res.json();
    }),
};

// ── Candidates (Admin) ──────────────────────────────────────────────
export const candidates = {
  list: (params?: {
    status?: string;
    project_id?: string;
    priority?: string;
    search?: string;
    page?: number;
  }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<Candidate[]>(`/api/admin/candidates?${q}`);
  },
  get: (id: string) => request<Candidate>(`/api/admin/candidates/${id}`),
  update: (id: string, data: Partial<Candidate>) =>
    request<Candidate>(`/api/admin/candidates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  verify: (id: string) =>
    request(`/api/admin/candidates/${id}/verify`, { method: "POST" }),
  sendEmail: (id: string, payload: { to: string; subject: string; body: string; type: string }) =>
    request(`/api/admin/candidates/${id}/email`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDocumentUrl: (candidateId: string, docId: string) =>
    request<{ url: string; mime_type: string; filename: string }>(
      `/api/admin/candidates/${candidateId}/document/${docId}/url`
    ),
  getVerification: (id: string) =>
    request<VerificationResult | null>(`/api/admin/candidates/${id}/verification`),
};

// ── Lottery ─────────────────────────────────────────────────────────
export const lottery = {
  run: (payload: { project_id: string; drawn_by: string; seed?: string }) =>
    request<LotteryRecord>("/api/admin/lottery/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getByProject: (projectId: string) =>
    request<LotteryRecord[]>(`/api/admin/lottery/project/${projectId}`),
};

// ── Apartments ──────────────────────────────────────────────────────
export const apartments = {
  list: (params?: { project_id?: string; available_only?: boolean }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<Apartment[]>(`/api/admin/apartments?${q}`);
  },
  assign: (apartmentId: string, candidateId: string) =>
    request<Apartment>(`/api/admin/apartments/${apartmentId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ candidate_id: candidateId }),
    }),
  promoteWaitlist: (projectId: string) =>
    request(`/api/admin/apartments/waitlist/promote?project_id=${projectId}`, {
      method: "POST",
    }),
};

// ── Reports ─────────────────────────────────────────────────────────
export const reports = {
  summary: (projectId?: string) =>
    request<ReportSummary>(`/api/admin/reports/summary${projectId ? `?project_id=${projectId}` : ""}`),
  winners: (projectId?: string) =>
    request<WinnerReport[]>(`/api/admin/reports/winners${projectId ? `?project_id=${projectId}` : ""}`),
  exportCsvUrl: (projectId?: string) =>
    `${API_BASE}/api/admin/reports/export/csv${projectId ? `?project_id=${projectId}` : ""}`,
};

// ── Search ──────────────────────────────────────────────────────────
export const search = {
  byId: (idNumber: string) =>
    request<SearchResult>(`/api/search?id=${idNumber}`),
};

// ── Rules ───────────────────────────────────────────────────────────
export const rules = {
  list: (params?: { q?: string; category?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<Rule[]>(`/api/rules?${q}`);
  },
  categories: () => request<string[]>("/api/rules/categories"),
};

// ── Types ───────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  address: string;
  total_units: number;
  status: string;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  candidate_id: string;
  type: string;
  filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  uploaded_at: string;
}

export interface VerificationResult {
  id: string;
  candidate_id: string;
  two_distinct_ids?: boolean;
  id_number_matches_card?: boolean;
  name_matches_card?: boolean;
  id_numbers_consistent?: boolean;
  names_consistent?: boolean;
  form_date_valid?: boolean;
  has_proper_stamp?: boolean;
  eligibility_number?: string;
  is_apartmentless?: boolean;
  overall_pass: boolean;
  raw_ai_response?: unknown;
  verified_at: string;
}

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone?: string;
  project_id: string;
  priority: string;
  status: string;
  lottery_number?: number;
  registration_date: string;
  appeal_deadline?: string;
  eligibility_number?: string;
  is_apartmentless?: boolean;
  notes?: string;
  apartment_chosen_id?: string;
  created_at: string;
  updated_at: string;
  documents: Document[];
  verification_result?: VerificationResult;
}

export interface Apartment {
  id: string;
  project_id: string;
  number: string;
  floor: number;
  rooms: number;
  sqm: number;
  price: number;
  taken: boolean;
}

export interface LotteryRecord {
  id: string;
  project_id: string;
  drawn_at: string;
  drawn_by: string;
  results: Array<{ candidateId: string; lotteryNumber: number; status: string }>;
  seed?: string;
}

export interface ReportSummary {
  total_registrants: number;
  by_status: Record<string, number>;
  total_apartments: number;
  taken_apartments: number;
  available_apartments: number;
}

export interface WinnerReport {
  lottery_number: number;
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  priority: string;
  status: string;
  apartment_chosen_id?: string;
  email: string;
}

export interface SearchResult {
  found: boolean;
  name: string;
  lottery_position?: number;
  status: string;
  project_id: string;
  apartment_assigned: boolean;
}

export interface Rule {
  id: string;
  category: string;
  title: string;
  content: string;
  order: number;
}
