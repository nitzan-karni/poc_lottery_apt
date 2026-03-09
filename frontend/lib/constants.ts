export const COLORS = {
  primary: "#00838F",
  primaryDark: "#006064",
  primaryLight: "#4DB6AC",
  accent: "#EF6C00",
  accentLight: "#FF9800",
  bg: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#E0F2F1",
  text: "#212121",
  textSecondary: "#546E7A",
  border: "#CFD8DC",
  success: "#2E7D32",
  error: "#C62828",
  warning: "#F57F17",
} as const;

export const PRIORITY_LABELS: Record<string, string> = {
  DISABLED: "Disabled (×5)",
  MILITARY_RESERVES: "Military Reserves (×4)",
  LOCAL_RESIDENT: "Local Resident (×3)",
  YOUNG_COUPLE: "Young Couple (×2)",
  STANDARD: "Standard (×1)",
};

export const PRIORITY_WEIGHTS: Record<string, number> = {
  DISABLED: 5,
  MILITARY_RESERVES: 4,
  LOCAL_RESIDENT: 3,
  YOUNG_COUPLE: 2,
  STANDARD: 1,
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  AI_VERIFIED: "AI Verified",
  APPROVED: "Approved",
  NEEDS_CORRECTION: "Needs Correction",
  REJECTED: "Rejected",
  WINNER: "Winner",
  WAITLIST: "Waitlist",
  APARTMENT_CHOSEN: "Apartment Chosen",
  DISQUALIFIED: "Disqualified",
};

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING_REVIEW: { bg: "#FFF3E0", color: "#E65100" },
  AI_VERIFIED: { bg: "#E3F2FD", color: "#1565C0" },
  APPROVED: { bg: "#E8F5E9", color: "#2E7D32" },
  NEEDS_CORRECTION: { bg: "#FFF8E1", color: "#F57F17" },
  REJECTED: { bg: "#FFEBEE", color: "#C62828" },
  WINNER: { bg: "#E0F2F1", color: "#00695C" },
  WAITLIST: { bg: "#F3E5F5", color: "#6A1B9A" },
  APARTMENT_CHOSEN: { bg: "#E8F5E9", color: "#1B5E20" },
  DISQUALIFIED: { bg: "#FFEBEE", color: "#B71C1C" },
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID_CARD: "ID Card",
  ELIGIBILITY_CERTIFICATE: "Eligibility Certificate",
  DISABILITY_CERTIFICATE: "Disability Certificate",
  MILITARY_SERVICE_PROOF: "Military Service Proof",
  RESIDENCY_PROOF: "Residency Proof",
  FINANCIAL_DOCUMENT: "Financial Document",
  OTHER: "Other",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  LOTTERY_DRAWN: "Lottery Drawn",
  ASSIGNMENT_IN_PROGRESS: "Assignment In Progress",
  COMPLETED: "Completed",
};
