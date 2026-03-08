# CLAUDE.md — Affordable Housing Lottery System (Ezra VaBitaron)

## Project Overview

Build a **full-stack Affordable Housing Lottery System** for Ezra VaBitaron (עזרה ובצרון), a municipal company operating under the Tel Aviv-Yafo Municipality. The system manages the complete lifecycle of affordable housing lotteries: candidate registration, AI-powered document verification, manual QA review, priority-weighted lottery draws, winner management, apartment assignment, waitlist promotion, and regulatory compliance.

**Client:** Ezra VaBitaron — Tel Aviv-Yafo Municipality  
**Domain:** Affordable housing (דיור בהישג יד)  
**Jurisdiction:** Israeli law, Tel Aviv-Yafo courts  
**Languages:** UI in English (RTL-ready for future Hebrew localization)  
**Target:** Cloud-deployable MVP (Vercel/Railway/Fly.io)

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom theme tokens matching e-b.co.il brand
- **State Management:** Zustand (or React Context for simpler slices)
- **Forms:** React Hook Form + Zod validation
- **File Uploads:** react-dropzone
- **Tables:** TanStack Table v8
- **Notifications/Toasts:** sonner
- **Modals:** @radix-ui/react-dialog
- **PDF Viewer:** react-pdf (for inline document preview in QA panel)
- **Date Handling:** date-fns

### Backend
- **Runtime:** Node.js (Next.js API Routes or standalone Express)
- **Database:** PostgreSQL (via Prisma ORM)
- **File Storage:** S3-compatible (AWS S3, Cloudflare R2, or MinIO for local dev)
- **Email:** Resend (or Nodemailer with SMTP fallback)
- **Job Queue:** BullMQ + Redis (for async AI verification jobs)
- **Authentication:** NextAuth.js (admin login) — public registration is unauthenticated

### AI / Document Verification
- **OCR + Vision:** Claude API (claude-sonnet-4-20250514) via Anthropic SDK
  - Send document images as base64 to Claude's vision endpoint
  - Structured JSON output for extraction and verification
- **Fallback OCR:** Tesseract.js (client-side fallback if API unavailable)

### Infrastructure
- **Containerization:** Docker + docker-compose for local dev
- **Deployment:** Vercel (frontend) + Railway/Fly.io (backend + DB + Redis)
- **CI:** GitHub Actions

---

## Color Scheme & Brand

Match the **e-b.co.il** website identity:

```typescript
// theme/colors.ts
export const colors = {
  primary:      "#00838F",   // Teal — main brand color (headers, sidebar, buttons)
  primaryDark:  "#006064",   // Dark teal — sidebar gradient top, headings
  primaryLight: "#4DB6AC",   // Light teal — hover states, accents
  accent:       "#EF6C00",   // Orange — CTAs, lottery numbers, important actions
  accentLight:  "#FF9800",   // Light orange — hover on accent buttons
  bg:           "#F5F7FA",   // Page background
  surface:      "#FFFFFF",   // Card/panel background
  surfaceAlt:   "#E0F2F1",   // Alternate surface (teal tint)
  text:         "#212121",   // Primary text
  textSecondary:"#546E7A",   // Secondary/muted text
  border:       "#CFD8DC",   // Borders, dividers
  success:      "#2E7D32",   // Approved, verified
  error:        "#C62828",   // Rejected, errors
  warning:      "#F57F17",   // Needs correction, pending
};
```

Sidebar uses a vertical gradient: `linear-gradient(180deg, #004D54 0%, #00838F 100%)`

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id          String       @id @default(cuid())
  name        String       // e.g. "Neve Ofer Towers"
  address     String
  totalUnits  Int
  status      ProjectStatus @default(UPCOMING)
  deadline    DateTime     // registration deadline
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  candidates  Candidate[]
  apartments  Apartment[]
  lotteries   Lottery[]
}

enum ProjectStatus {
  UPCOMING
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  LOTTERY_DRAWN
  ASSIGNMENT_IN_PROGRESS
  COMPLETED
}

model Candidate {
  id                 String          @id @default(cuid())
  firstName          String
  lastName           String
  idNumber           String          // Israeli Teudat Zehut (9 digits)
  phone              String?
  email              String
  projectId          String
  project            Project         @relation(fields: [projectId], references: [id])
  priority           PriorityType    @default(STANDARD)
  status             CandidateStatus @default(PENDING_REVIEW)
  lotteryNumber      Int?            // assigned after draw
  apartmentChosenId  String?
  apartmentChosen    Apartment?      @relation(fields: [apartmentChosenId], references: [id])
  eligibilityNumber  String?         // extracted from eligibility certificate
  isApartmentless    Boolean?        // extracted from eligibility form
  registrationDate   DateTime        @default(now())
  appealDeadline     DateTime?
  notes              String?
  documents          Document[]
  verificationResult VerificationResult?
  emailLogs          EmailLog[]
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@unique([idNumber, projectId])  // one registration per project per person
  @@index([projectId, status])
  @@index([idNumber])
}

enum PriorityType {
  DISABLED        // weight 5
  MILITARY_RESERVES // weight 4
  LOCAL_RESIDENT  // weight 3
  YOUNG_COUPLE    // weight 2
  STANDARD        // weight 1
}

enum CandidateStatus {
  PENDING_REVIEW
  AI_VERIFIED
  APPROVED
  NEEDS_CORRECTION
  REJECTED
  WINNER
  WAITLIST
  APARTMENT_CHOSEN
  DISQUALIFIED
}

model Document {
  id           String       @id @default(cuid())
  candidateId  String
  candidate    Candidate    @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  type         DocumentType
  filename     String       // original filename
  storageKey   String       // S3 key
  mimeType     String
  fileSize     Int
  verified     Boolean      @default(false)
  verifiedBy   String?      // "AI" or admin user ID
  verifiedAt   DateTime?
  extractedData Json?       // JSON blob of OCR-extracted fields
  uploadedAt   DateTime     @default(now())

  @@index([candidateId])
}

enum DocumentType {
  ID_CARD
  ELIGIBILITY_CERTIFICATE
  DISABILITY_CERTIFICATE
  MILITARY_SERVICE_PROOF
  RESIDENCY_PROOF
  FINANCIAL_DOCUMENT
  OTHER
}

model VerificationResult {
  id                    String    @id @default(cuid())
  candidateId           String    @unique
  candidate             Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  twoDistinctIds        Boolean?  // CV check: 2 uploaded IDs are different documents
  idNumberMatchesCard   Boolean?  // ID number on card matches form input
  nameMatchesCard       Boolean?  // Name on card matches registration name
  idNumbersConsistent   Boolean?  // All ID numbers across docs are consistent
  namesConsistent       Boolean?  // All names across docs are consistent
  formDateValid         Boolean?  // Eligibility form date is valid for today
  hasProperStamp        Boolean?  // Official stamp detected on certificate
  eligibilityNumber     String?   // Extracted eligibility number
  isApartmentless       Boolean?  // Form confirms apartment-free status
  overallPass           Boolean   @default(false)
  rawAiResponse         Json?     // Full AI response for audit trail
  verifiedAt            DateTime  @default(now())
}

model Apartment {
  id        String    @id @default(cuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id])
  number    String    // e.g. "3B"
  floor     Int
  rooms     Float     // e.g. 3.5
  sqm       Float
  price     Float
  taken     Boolean   @default(false)
  takenBy   Candidate?

  @@index([projectId, taken])
}

model Lottery {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  drawnAt   DateTime @default(now())
  drawnBy   String   // admin user ID
  results   Json     // ordered list of { candidateId, lotteryNumber, status }
  seed      String?  // random seed for audit reproducibility
}

model EmailLog {
  id          String   @id @default(cuid())
  candidateId String?
  candidate   Candidate? @relation(fields: [candidateId], references: [id])
  to          String
  subject     String
  body        String
  type        EmailType
  sentAt      DateTime @default(now())
  status      String   @default("sent") // sent, failed, bounced
}

enum EmailType {
  CORRECTION_REQUEST
  APPROVAL_NOTICE
  REJECTION_NOTICE
  LOTTERY_RESULT
  APARTMENT_TOUR_INVITATION
  WAITLIST_PROMOTION
  GENERAL
}

model AdminUser {
  id           String @id @default(cuid())
  email        String @unique
  name         String
  passwordHash String
  role         AdminRole @default(REVIEWER)
  createdAt    DateTime @default(now())
}

enum AdminRole {
  SUPER_ADMIN
  REVIEWER
  VIEWER
}

model Rule {
  id       String @id @default(cuid())
  category String // "Eligibility", "Documents", "Appeals", "Penalties", "Waiting List", "General", "Priority"
  title    String
  content  String // full rule text
  order    Int    @default(0)
}
```

---

## Feature Specifications

### 1. Public Registration Portal (`/register`)

**Route:** `/register` (unauthenticated, public-facing)

**Flow:**
1. Candidate fills out a form with: First Name, Last Name, ID Number (ת.ז — 9 digits, validated with Israeli ID checksum algorithm), Phone, Email, Priority Category (dropdown), Project (dropdown of open projects).
2. **Required uploads:** ID Card image/PDF, Eligibility Certificate image/PDF.
3. **Optional additional uploads:** Financial documents, Residency proof, Disability certificate, Military service proof, Other supporting documents. Each upload has a dropdown to tag its DocumentType.
4. On submit: validate all fields client-side → upload files to S3 → create Candidate + Document records → enqueue AI verification job → show success message with reference number.
5. **Deadline enforcement:** If `project.deadline` has passed, block registration with a clear message. This maps to the rule: "Late online registrations are automatically disqualified."
6. **Duplicate prevention:** Unique constraint on (idNumber, projectId). Show clear error if already registered.

**Israeli ID Validation (Luhn-variant):**
```typescript
function validateIsraeliId(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  const sum = id.split('').reduce((acc, digit, i) => {
    let n = parseInt(digit) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    return acc + n;
  }, 0);
  return sum % 10 === 0;
}
```

**Form Layout:** Two-column grid on desktop, single column on mobile. File upload zone with drag-and-drop. Legal disclaimer checkbox at bottom referencing penalties for false information (₪5,000/month + criminal proceedings).

---

### 2. AI-Powered Document Verification (`/api/verify`)

**Trigger:** Async job (BullMQ) enqueued after registration submission.

**AI Verification Pipeline — uses Claude Vision API:**

For each candidate, send ALL uploaded document images to Claude in a single multi-image request with a structured system prompt. The API call:

```typescript
// services/documentVerifier.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface VerificationInput {
  candidateFirstName: string;
  candidateLastName: string;
  candidateIdNumber: string;
  documents: Array<{
    type: DocumentType;
    base64: string;
    mimeType: string;
  }>;
}

async function verifyDocuments(input: VerificationInput) {
  const imageContent = input.documents.map(doc => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: doc.mimeType as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
      data: doc.base64,
    },
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `You are a document verification agent for an Israeli affordable housing lottery.

The candidate registered with:
- Name: ${input.candidateFirstName} ${input.candidateLastName}
- ID Number (Teudat Zehut): ${input.candidateIdNumber}

Analyze ALL uploaded documents and return ONLY a JSON object (no markdown, no backticks) with these fields:

{
  "two_distinct_ids": boolean | null,
    // If 2 ID document images were uploaded, verify they are visually DIFFERENT documents (not the same scan twice). null if only 1 ID uploaded.
  "id_number_matches_card": boolean,
    // Does the 9-digit ID number visible on the ID card match "${input.candidateIdNumber}"?
  "name_matches_card": boolean,
    // Does the name on the ID card match "${input.candidateFirstName} ${input.candidateLastName}"? Account for Hebrew/English transliteration variations.
  "id_numbers_consistent": boolean,
    // Are all ID numbers across ALL documents (ID card, eligibility form, etc.) the same?
  "names_consistent": boolean,
    // Are all names across ALL documents consistent (same person)?
  "form_date_valid": boolean,
    // Is the date on the eligibility certificate/form still valid as of today (${new Date().toISOString().split("T")[0]})? Check expiry dates, issuance dates. If the form has no explicit expiry, check if issued within last 12 months.
  "has_proper_stamp": boolean,
    // Is there an official stamp/seal visible on the eligibility certificate? Look for circular stamps, institutional logos, or official markings.
  "eligibility_number": string | null,
    // Extract the eligibility/certificate number from the uploaded eligibility form. Return null if not found.
  "is_apartmentless": boolean | null,
    // Does the eligibility form explicitly state the candidate is apartment-free (חסר דירה)? Return null if cannot determine.
  "confidence_notes": string
    // Brief notes on anything uncertain or flagged.
}

Be strict. If you cannot clearly read a field, mark it as false. Return ONLY the JSON.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

  return {
    ...parsed,
    overall_pass:
      parsed.id_number_matches_card &&
      parsed.name_matches_card &&
      parsed.id_numbers_consistent &&
      parsed.names_consistent &&
      parsed.form_date_valid &&
      parsed.has_proper_stamp &&
      (parsed.is_apartmentless === true || parsed.is_apartmentless === null) &&
      (parsed.two_distinct_ids !== false),
  };
}
```

**Post-verification logic:**
- If `overall_pass === true` → set candidate status to `AI_VERIFIED`
- If `overall_pass === false` → set candidate status to `NEEDS_CORRECTION`, auto-generate a correction email listing which checks failed
- Store full verification result in `VerificationResult` table
- Store `eligibilityNumber` and `isApartmentless` on the Candidate record

**Error handling:** If the AI call fails, log the error and leave status as `PENDING_REVIEW` for manual review. Never auto-reject on API failure.

---

### 3. Admin Document QA Panel (`/admin/qa`)

**Route:** `/admin/qa` (authenticated, admin only)

**Table View (TanStack Table):**

Columns:
| Column | Content |
|--------|---------|
| Name | `{firstName} {lastName}` — clickable to open detail panel |
| ID Number | Monospace, masked middle digits for privacy in list view |
| Priority | Badge with priority label |
| Project | Project name |
| AI Check | Green checkmark / Red X / Yellow pending icon |
| Documents | Compact badges showing each doc type + verified status |
| Status | Color-coded status badge |
| Actions | Action buttons row |

**Filters (above table):**
- Status filter tabs: All, Pending Review, AI Verified, Needs Correction, Approved, Rejected
- Search bar: filter by name or ID number
- Project dropdown filter
- Priority dropdown filter

**Detail Panel (slide-out or modal):**

When clicking a candidate row, open a full detail view:

1. **Candidate Info Section:** All registration fields displayed in a 2-column grid.
2. **AI Verification Results Section:** Show each check as a row with ✅/❌ icon, the check name, and a brief note. Highlight any failed checks in red.
3. **Document Viewer Section:** 
   - List all uploaded documents as cards
   - Each card has: document type label, upload date, verified badge, and a **"View Document"** button
   - **"View Document"** opens an **inline PDF/image viewer** (react-pdf for PDFs, native `<img>` for images) in a large modal/panel so the admin can inspect the actual document WITHOUT leaving the page
   - Below the viewer: **"Mark as Valid"** button (green) and **"Send for Correction"** button (orange)

4. **"Send for Correction" Flow:**
   - Clicking "Send for Correction" opens a **popup/modal** with:
     - Pre-filled "To" field (candidate email)
     - Pre-filled subject line: "Affordable Housing Lottery — Document Correction Required"
     - A **text area** where the admin types exactly what needs to be resubmitted (e.g., "Your ID card image is blurry. Please re-upload a clear scan. Additionally, your eligibility certificate appears expired — please obtain an updated one.")
     - A "Send Email" button
   - On send: create EmailLog record, send via Resend/SMTP, update candidate status to `NEEDS_CORRECTION`

5. **Quick Actions in the detail panel:**
   - **Approve** (green button) → sets status to `APPROVED`
   - **Reject** (red button) → sets status to `REJECTED`, calculates `appealDeadline` = now + 3 calendar days, sends rejection email with appeal instructions (email: tlv4less@e-b.co.il)
   - **Send for Correction** (orange button) → popup flow above

6. **Bulk Actions (top of table):**
   - Select multiple candidates via checkboxes
   - "Approve Selected" — batch approve all AI_VERIFIED candidates
   - "Email Selected" — batch send a template email

---

### 4. Lottery Engine (`/admin/lottery`)

**Route:** `/admin/lottery` (admin only)

**Pre-Lottery View:**
- Project selector dropdown
- Shows count of eligible (APPROVED) candidates per priority tier
- Priority weight display: Disabled (5×), Military Reserves (4×), Local Resident (3×), Young Couple (2×), Standard (1×)
- **"Run Lottery" button** (accent orange, prominent)

**Lottery Algorithm:**

```typescript
// services/lotteryEngine.ts

interface LotteryCandidate {
  id: string;
  priority: PriorityType;
}

const PRIORITY_WEIGHTS: Record<PriorityType, number> = {
  DISABLED: 5,
  MILITARY_RESERVES: 4,
  LOCAL_RESIDENT: 3,
  YOUNG_COUPLE: 2,
  STANDARD: 1,
};

function runLottery(candidates: LotteryCandidate[], totalUnits: number, seed?: string): LotteryResult[] {
  // Generate a cryptographic random seed for audit trail
  const rng = createSeededRng(seed || crypto.randomUUID());

  // Weighted shuffle: each candidate gets a score = random() ^ (1/weight)
  // This is the "weighted reservoir sampling" approach (Efraimidis & Spirakis)
  const scored = candidates.map(c => ({
    ...c,
    score: Math.pow(rng(), 1 / PRIORITY_WEIGHTS[c.priority]),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Assign lottery numbers and status
  return scored.map((c, index) => ({
    candidateId: c.id,
    lotteryNumber: index + 1,
    status: index < totalUnits ? "WINNER" : "WAITLIST",
  }));
}
```

**Post-Lottery Actions (automatic):**
1. Update all candidates: set `lotteryNumber` and `status` (WINNER or WAITLIST)
2. Create `Lottery` record with full results JSON and seed
3. **Send result emails to ALL participants:**
   - **Winners:** "Congratulations! You have been selected in the affordable housing lottery for [Project Name]. Your lottery number is #[X]. You will receive a separate invitation to schedule an apartment viewing tour."
   - **Waitlisted:** "You have been placed on the waiting list at position #[X] for [Project Name]. If a spot becomes available, you will be contacted. Your eligibility must be maintained throughout the waiting period."
4. **Send apartment tour invitation emails to winners:**
   - "Dear [Name], as a winner (#[X]) in the [Project Name] lottery, you are invited to schedule a tour and select your apartment. Please respond to this email or call [phone] to book your appointment within 14 days."

**Post-Lottery Display:**
- Results table: lottery number, name, ID (masked), priority, status (Winner/Waitlist)
- Winners are highlighted with green background
- Export to CSV/Excel button

---

### 5. Winner & Apartment Management (`/admin/winners`)

**Route:** `/admin/winners` (admin only)

**Two sections:**

**A) Winners Table:**
- Sortable by lottery number
- Columns: #, Name, ID, Priority, Apartment (assigned or "—"), Status
- **"Assign Apartment" button** per winner → opens a modal showing all AVAILABLE apartments as clickable cards (apartment number, floor, rooms, sqm, price). Clicking a card assigns it.
- After assignment: update `Apartment.taken = true`, update `Candidate.apartmentChosenId`, update candidate status to `APARTMENT_CHOSEN`

**B) Waiting List Table:**
- Ordered by lottery number
- Shows position, name, priority
- **"Promote Next" button** at top → takes the first waitlisted candidate, sets status to `WINNER`, sends them an apartment tour invitation email
- **Re-evaluation note:** If a waitlisted candidate is promoted 6+ months after the lottery draw, display a warning: "⚠ 6+ months since lottery — eligibility re-evaluation required per regulations." The admin must manually confirm re-evaluation before proceeding.

**Automatic Table Updates:**
- When a winner selects an apartment, they are moved from "pending selection" to "completed" in the winners table
- Available apartment count updates in real-time
- If all winners have chosen or declined, auto-prompt to promote from waitlist

---

### 6. Public Lottery Position Search (`/search`)

**Route:** `/search` (unauthenticated, public-facing)

Simple search page:
- Large input field: "Enter your ID number (ת.ז) to check your lottery status"
- Search button
- Results card showing: Name (partially masked: "Y*** C***"), Lottery Position #, Status (Winner/Waitlist/Pending), Project Name, Apartment (if assigned, otherwise "Not yet assigned")
- If not found: "No results found. Please verify your ID number."
- **No sensitive data exposed** — mask names, don't show full ID, don't show other candidates' info

---

### 7. Rules & Regulations Search Engine (`/rules`)

**Route:** `/rules` (public or admin — available to both)

- Full-text search across all rules
- Rules grouped by category: Eligibility, Documents, Appeals, Penalties, Waiting List, General, Priority
- Each rule displayed as a card with category label, title, and full text
- Search highlights matching terms

**Seed the `Rule` table with these regulations:**

1. **Eligibility > Registration Requirements:** Only candidates meeting all eligibility criteria (detailed in project registration booklets) may participate. The municipality may request additional documents or accept alternatives at its sole discretion.
2. **Eligibility > Late Registration:** Late online registrations are automatically disqualified. Ensure submission before the published deadline.
3. **Documents > Original Documents:** Candidates must keep original documents until the process ends. If requested, originals must be submitted to Ezra VaBitaron within 5 business days; failure results in disqualification.
4. **Appeals > Appeal Process:** Candidates found ineligible may submit a written, reasoned appeal within 3 calendar days to tlv4less@e-b.co.il. The appeals committee's decision is final and sent by email.
5. **Penalties > False Information:** Providing false/misleading information at any stage can result in disqualification, exclusion from future projects (temporarily or permanently), and criminal proceedings.
6. **Penalties > Post-Contract Discovery:** If false information is discovered after a rental contract is signed, the municipality can terminate the contract and charge ₪5,000/month (+ prime rate + 6.5% interest) for each month of actual occupancy.
7. **Waiting List > Validity Period:** Waiting lists are valid for the period stated in the registration booklet.
8. **Waiting List > Re-evaluation:** If a waiting-list candidate is contacted 6+ months after the lottery, eligibility is re-evaluated at that time. Candidates must remain apartment-free throughout the entire process.
9. **General > Regulation Changes:** The municipality may change the regulations at any time without prior notice.
10. **General > Jurisdiction:** Exclusive jurisdiction: Tel Aviv-Yafo courts, under Israeli law.
11. **Priority > Priority Categories:** Lottery draws are weighted by priority: Disabled (×5), Military Reserves (×4), Local Residents (×3), Young Couples (×2), Standard (×1).

---

### 8. Reports & Analytics (`/admin/reports`)

**Route:** `/admin/reports` (admin only)

**Dashboard Stats Cards:**
- Total Registrants, Approved, AI Verified, Needs Correction, Rejected, Winners, Apartments Chosen, Waitlisted

**Winner Status Report Table:**
- All winners with: #, Name, ID, Priority, Apartment chosen (or pending), Status
- Filterable by "Chosen" vs "Awaiting Selection"

**Apartment Occupancy Grid:**
- Visual grid of all apartments — taken (teal) vs available (gray)
- Hovering shows apartment details + who took it

**Export:**
- "Export to CSV" and "Export to Excel" buttons for the winner status table
- "Generate PDF Report" for a formatted winner status summary

**Periodic Report Generation:**
- Admin can trigger "Generate Status Report" which creates a snapshot stored in the database
- Optionally schedule via cron (weekly) to auto-email a summary to configured admin addresses

---

### 9. Email System

**All email templates:**

| Trigger | Template | Recipients |
|---------|----------|------------|
| Admin sends correction request | Custom text from admin popup | Individual candidate |
| AI verification fails | Auto-generated list of failed checks | Individual candidate |
| Admin approves candidate | "Your registration has been approved" | Individual candidate |
| Admin rejects candidate | "Your registration was not approved. Appeal within 3 days to tlv4less@e-b.co.il" | Individual candidate |
| Lottery drawn — winner | "Congratulations! Lottery number #X" + tour invitation | All winners |
| Lottery drawn — waitlist | "Waitlist position #X" | All waitlisted |
| Apartment tour invitation | "Schedule your apartment viewing" | Individual winner |
| Waitlist promotion | "A spot has opened — you are now a winner" + tour invitation | Individual promoted candidate |

**Email implementation:**

```typescript
// services/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  candidateId?: string;
  type: EmailType;
}

async function sendEmail(params: SendEmailParams) {
  const result = await resend.emails.send({
    from: "Ezra VaBitaron <noreply@lottery.e-b.co.il>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  // Log to database
  await prisma.emailLog.create({
    data: {
      candidateId: params.candidateId,
      to: params.to,
      subject: params.subject,
      body: params.html,
      type: params.type,
      status: result.error ? "failed" : "sent",
    },
  });

  return result;
}
```

---

## API Routes

```
POST   /api/register              — Public registration + file upload
GET    /api/projects               — List active projects (public)
GET    /api/search?id=XXXXXXXXX    — Public lottery position search

# Admin (authenticated)
GET    /api/admin/candidates       — List candidates (filterable, paginated)
GET    /api/admin/candidates/:id   — Get candidate details + documents + verification
PATCH  /api/admin/candidates/:id   — Update candidate status
GET    /api/admin/candidates/:id/document/:docId — Get document file (S3 presigned URL)
POST   /api/admin/candidates/:id/verify — Re-run AI verification
POST   /api/admin/candidates/:id/email  — Send correction/notification email

POST   /api/admin/lottery/run       — Execute lottery draw for a project
GET    /api/admin/lottery/:id       — Get lottery results

GET    /api/admin/apartments        — List apartments for a project
PATCH  /api/admin/apartments/:id    — Assign apartment to winner

POST   /api/admin/waitlist/promote  — Promote next waitlisted candidate

GET    /api/admin/reports/summary   — Get dashboard stats
GET    /api/admin/reports/export    — Export winners as CSV/Excel

GET    /api/rules                   — Search rules (public)

POST   /api/auth/login              — Admin login
POST   /api/auth/logout             — Admin logout
```

---

## Synthetic / Seed Data

Generate seed data for development and demo purposes:

```typescript
// prisma/seed.ts
// Generate:
// - 2 projects (Neve Ofer Towers — active, Florentin Gardens — upcoming)
// - 50 candidates with varied statuses and priorities
// - 48 apartments for Neve Ofer (6 already taken by winners)
// - Documents for each candidate (with mock S3 keys)
// - Verification results for candidates that have been through AI check
// - 11 lottery rules (as listed in Section 7)
// - 2 admin users (super_admin@e-b.co.il / reviewer@e-b.co.il)
// - Sample email logs

// Use the name pools from the skeleton:
const firstNames = ["Yael", "Noam", "Tamar", "Oren", "Shira", "Amit", "Dalia", "Eitan", "Maya", "Lior", "Noa", "Avi", "Michal", "Gal", "Roni", "Dana", "Idan", "Tali", "Ofir", "Shai", "Ella", "Rotem", "Yonatan", "Keren", "Omri", "Hila", "Alon", "Neta", "Uri", "Sapir"];
const lastNames = ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman", "Shapiro", "Goldstein", "Ben-David", "Katz", "Azulay", "Malka", "Yosef", "Haim", "Ochana", "Hadad", "Sasson", "Amar"];
```

---

## Project Structure

```
lottery-system/
├── CLAUDE.md                    # This file
├── docker-compose.yml           # Postgres + Redis + MinIO for local dev
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── logo.png                 # E&B logo
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with sidebar nav
│   │   ├── page.tsx             # Redirect to /admin/dashboard
│   │   ├── register/
│   │   │   └── page.tsx         # Public registration form
│   │   ├── search/
│   │   │   └── page.tsx         # Public lottery search
│   │   ├── rules/
│   │   │   └── page.tsx         # Public rules search
│   │   ├── admin/
│   │   │   ├── layout.tsx       # Admin layout with sidebar + auth guard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── qa/
│   │   │   │   └── page.tsx     # Document QA table + detail panel
│   │   │   ├── lottery/
│   │   │   │   └── page.tsx     # Lottery engine
│   │   │   ├── winners/
│   │   │   │   └── page.tsx     # Winner management + apartment assignment
│   │   │   └── reports/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── register/
│   │       │   └── route.ts
│   │       ├── projects/
│   │       │   └── route.ts
│   │       ├── search/
│   │       │   └── route.ts
│   │       ├── rules/
│   │       │   └── route.ts
│   │       ├── auth/
│   │       │   └── [...nextauth]/route.ts
│   │       └── admin/
│   │           ├── candidates/
│   │           │   ├── route.ts
│   │           │   └── [id]/
│   │           │       ├── route.ts
│   │           │       ├── verify/route.ts
│   │           │       ├── email/route.ts
│   │           │       └── document/[docId]/route.ts
│   │           ├── lottery/
│   │           │   └── route.ts
│   │           ├── apartments/
│   │           │   └── [id]/route.ts
│   │           ├── waitlist/
│   │           │   └── promote/route.ts
│   │           └── reports/
│   │               ├── summary/route.ts
│   │               └── export/route.ts
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── DataTable.tsx    # TanStack Table wrapper
│   │   │   └── FileDropzone.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── registration/
│   │   │   └── RegistrationForm.tsx
│   │   ├── qa/
│   │   │   ├── CandidateTable.tsx
│   │   │   ├── CandidateDetail.tsx
│   │   │   ├── DocumentViewer.tsx    # Inline PDF/image viewer
│   │   │   ├── VerificationChecklist.tsx
│   │   │   └── CorrectionEmailModal.tsx
│   │   ├── lottery/
│   │   │   ├── LotteryControls.tsx
│   │   │   └── LotteryResults.tsx
│   │   ├── winners/
│   │   │   ├── WinnersTable.tsx
│   │   │   ├── WaitlistTable.tsx
│   │   │   └── ApartmentAssignModal.tsx
│   │   ├── search/
│   │   │   └── LotterySearch.tsx
│   │   └── reports/
│   │       ├── DashboardStats.tsx
│   │       └── ApartmentGrid.tsx
│   ├── services/
│   │   ├── documentVerifier.ts   # Claude AI verification logic
│   │   ├── lotteryEngine.ts      # Weighted lottery algorithm
│   │   ├── emailService.ts       # Resend email wrapper
│   │   └── fileStorage.ts        # S3 upload/download helpers
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── auth.ts               # NextAuth config
│   │   ├── validators.ts         # Zod schemas (Israeli ID, forms, etc.)
│   │   └── constants.ts          # Priority weights, status labels, colors
│   └── types/
│       └── index.ts              # Shared TypeScript types
```

---

## Environment Variables

```env
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lottery"
REDIS_URL="redis://localhost:6379"

# S3 / File Storage
S3_BUCKET="lottery-documents"
S3_REGION="us-east-1"
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_ENDPOINT=""  # For MinIO: http://localhost:9000

# AI Verification
ANTHROPIC_API_KEY=""

# Email
RESEND_API_KEY=""
EMAIL_FROM="Ezra VaBitaron <noreply@lottery.e-b.co.il>"

# Auth
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Implementation Priority (Build Order)

### Phase 1 — Core Foundation
1. Initialize Next.js project with TypeScript + Tailwind
2. Set up Prisma schema + PostgreSQL + run migrations
3. Build UI component library (Badge, Button, Input, Select, Modal, StatCard, DataTable)
4. Build admin layout with sidebar navigation
5. Seed database with synthetic data
6. Build Dashboard page with stats

### Phase 2 — Registration & Documents
7. Build public registration form with file upload
8. Set up S3 file storage service
9. Implement AI document verification service (Claude API)
10. Build async verification job queue (BullMQ)

### Phase 3 — Admin QA
11. Build Document QA table with filters
12. Build candidate detail panel with inline document viewer
13. Build correction email modal + email sending
14. Implement approve/reject/correction status flows

### Phase 4 — Lottery & Winners
15. Build lottery engine with weighted algorithm
16. Build lottery UI with pre/post draw views
17. Implement automatic post-lottery emails (winners + waitlist)
18. Build winner management table + apartment assignment modal
19. Build waitlist promotion with re-evaluation warnings

### Phase 5 — Public & Reports
20. Build public lottery position search
21. Build rules & regulations search engine
22. Build reports page with export functionality
23. Add admin authentication (NextAuth)

### Phase 6 — Polish
24. Add loading states, error boundaries, optimistic updates
25. Mobile responsiveness pass
26. Accessibility audit (keyboard nav, ARIA labels)
27. Docker compose for local dev
28. Deployment configuration

---

## Key Business Rules to Enforce in Code

1. **Registration deadline is absolute.** Block submissions after `project.deadline`. No exceptions in code — admin can extend deadline by updating the project.
2. **One registration per person per project.** Enforce via unique DB constraint + friendly error message.
3. **Appeal window is 3 calendar days** from rejection. Calculate and store `appealDeadline`. Display countdown in admin panel.
4. **Original documents within 5 business days.** If admin requests originals, track the request date and display a countdown/warning.
5. **Waitlist re-evaluation at 6+ months.** Calculate time delta between lottery draw date and promotion date. If ≥ 180 days, show mandatory re-evaluation warning.
6. **Candidates must remain apartment-free.** The AI verification checks this from the eligibility form. For waitlist promotions 6+ months later, require fresh documentation.
7. **False information penalty: ₪5,000/month + prime + 6.5%.** Display this prominently on registration form and in rejection emails.
8. **Priority weights are deterministic within the algorithm** but the lottery itself must be random (use cryptographic randomness with stored seed for audit).
9. **All email communications are logged** in the `EmailLog` table for audit trail.
10. **Document storage is permanent** until explicitly purged by super admin.

---

## Testing Notes

- Use the skeleton React component (`remixed-d61dd620.tsx`) as the **design reference** for UI patterns, color usage, component structure, and layout
- Verify Israeli ID checksum validation with known valid/invalid IDs
- Test lottery algorithm with edge cases: all same priority, single candidate, more candidates than units, zero eligible
- Test AI verification with: valid documents, mismatched names, expired forms, missing stamps, duplicate IDs
- Test email delivery in dev with Resend test mode or Mailtrap
- Load test the lottery draw with 500+ candidates

---

## Notes for Claude Code

- The uploaded `remixed-d61dd620.tsx` is the **UI skeleton/prototype**. Extract its design patterns (color scheme, component structure, layout) but rebuild as a proper Next.js application with real backend, database, and API routes.
- Prioritize working features over pixel-perfect design. The MVP must be functional end-to-end.
- Use TypeScript strict mode throughout.
- Every API route should validate input with Zod.
- All database queries should use Prisma — no raw SQL.
- File uploads must go through S3, never stored on the application server filesystem.
- The AI verification is the most critical differentiator — make it robust with good error handling and clear result display in the admin panel.
