# עזרה ובצרון — Affordable Housing Lottery System

Full-stack affordable housing lottery system for **Ezra VaBitaron**, operating under the **Tel Aviv-Yafo Municipality**.

## Architecture

```
poc_lottery_apt/
├── backend/          # FastAPI (Python) REST API
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── services/ # OpenAI, email, S3, lottery engine
│   │   └── workers/  # RQ background job workers
│   ├── tests/
│   │   └── fixtures/ # Synthetic test documents + ID images
│   └── seed.py       # Database seeder
├── frontend/         # Next.js 14 (TypeScript + Tailwind)
│   ├── app/
│   │   ├── register/       # Public registration form
│   │   ├── search/         # Public lottery status lookup
│   │   ├── rules/          # Rules & regulations
│   │   └── admin/          # Admin panel (dashboard, QA, lottery, winners, reports)
│   └── components/         # Reusable UI components
└── docker-compose.yml       # Full local dev stack
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + Alembic |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis + RQ |
| File Storage | S3-compatible (MinIO for local dev) |
| AI Verification | OpenAI GPT-4o Vision |
| Email | Resend |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Auth | JWT (python-jose + bcrypt) |

## Quick Start

### 1. Start Infrastructure

```bash
# With Docker (recommended)
docker compose up -d postgres redis minio

# Or start services manually (see below)
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY and other secrets

# Start the API server
uvicorn app.main:app --reload --port 8000

# In another terminal, seed the database
python seed.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super_admin@e-b.co.il | admin123 |
| QA Reviewer | reviewer@e-b.co.il | review123 |

## Features

### Public Portal
- **`/register`** — Candidate registration with Israeli ID validation (Luhn checksum), file upload, and deadline enforcement
- **`/search`** — Lottery position lookup by ID number (privacy-masked results)
- **`/rules`** — Full-text searchable rules & regulations

### Admin Panel (`/admin/*`)
- **Dashboard** — Live stats: registrants, approval rates, apartment occupancy
- **Document QA** — Review candidates, inspect AI verification results, send correction emails, approve/reject
- **Lottery Engine** — Priority-weighted draw (Disabled×5, Reserves×4, Local×3, Young Couple×2, Standard×1) with cryptographic seed for auditability
- **Winners Management** — Apartment assignment, waitlist promotion with 6-month re-evaluation warnings
- **Reports** — Full stats, winner table, apartment occupancy grid, CSV export

### AI Document Verification (OpenAI GPT-4o Vision)
For each registration, the system automatically:
1. Checks if the ID number on the card matches the registration
2. Checks if the name matches
3. Validates consistency across all uploaded documents
4. Verifies the eligibility certificate date and official stamp
5. Extracts the eligibility number and apartment-free status
6. Sets candidate status to `AI_VERIFIED` (pass) or `NEEDS_CORRECTION` (fail)

## Test Fixtures

Synthetic test documents are in `backend/tests/fixtures/`:

```bash
# Generate synthetic ID card images + מלג"ם eligibility certificates
cd backend && python tests/generate_test_docs.py

# Output: tests/fixtures/images/
#   id_card_*.png            — Israeli Teudat Zehut images
#   eligibility_cert_*.png   — מלג"ם eligibility certificates
```

### Synthetic Test IDs (valid checksum)

| Name | ID Number | Priority | Certificate |
|------|-----------|----------|-------------|
| Yael Cohen | 226705911 | Disabled | EL-2024-441892 |
| Noam Levi | 160371175 | Military Reserves | EL-2025-112347 |
| Tamar Mizrahi | 420223257 | Local Resident | EL-2025-203451 |
| Oren Peretz | 825340631 | Young Couple | EL-2025-318742 |
| Shira Biton | 129054490 | Standard | EL-2025-407831 |
| Amit Dahan | 682714043 | Disabled | EL-2024-512990 |
| Maya Avraham | 183428598 | Local Resident | EL-2025-608124 |
| Eitan Friedman | 156816845 | Young Couple | EL-2025-714553 |
| Lior Shapiro | 925134942 | Military Reserves | EL-2025-819007 |
| Dana Goldstein | 216154153 | Standard | EL-2025-923441 |

**Negative test cases** (designed to fail specific checks):
- `Noa Ben-David (846578318)` — Expired certificate (form_date_valid: ❌)
- `Gal Katz (715535753)` — Missing stamp (has_proper_stamp: ❌)
- `Rotem Azulay (107612236)` — Name mismatch (name_matches_card: ❌)

## API Reference

Full interactive docs at `http://localhost:8000/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Admin login → JWT token |
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/open` | List open registration projects |
| `POST` | `/api/register` | Submit registration + file upload |
| `GET` | `/api/search?id=XXXXXXXXX` | Public lottery lookup |
| `GET` | `/api/rules` | Search rules |
| `GET` | `/api/admin/candidates` | List candidates (admin) |
| `PATCH` | `/api/admin/candidates/:id` | Update candidate status |
| `POST` | `/api/admin/candidates/:id/verify` | Re-run AI verification |
| `POST` | `/api/admin/candidates/:id/email` | Send email to candidate |
| `POST` | `/api/admin/lottery/run` | Execute lottery draw |
| `GET` | `/api/admin/apartments` | List apartments |
| `PATCH` | `/api/admin/apartments/:id/assign` | Assign apartment to winner |
| `POST` | `/api/admin/apartments/waitlist/promote` | Promote next waitlisted candidate |
| `GET` | `/api/admin/reports/summary` | Stats dashboard data |
| `GET` | `/api/admin/reports/export/csv` | Export winners CSV |

## Environment Variables

See `backend/.env.example` for full reference.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lottery
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...          # Required for AI document verification
RESEND_API_KEY=re_...          # Required for email sending
S3_ENDPOINT=http://localhost:9000  # MinIO for local dev
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
SECRET_KEY=your-jwt-secret
```

## Business Rules

1. **Registration deadline is absolute** — submissions after `project.deadline` are blocked
2. **One registration per person per project** — enforced by unique DB constraint
3. **Appeal window: 3 calendar days** from rejection
4. **Waitlist re-evaluation at 6+ months** — mandatory warning shown when promoting candidates
5. **False information penalty: ₪5,000/month** + prime + 6.5% interest
6. **All emails logged** in `EmailLog` table for audit trail
7. **Lottery seed stored** with every draw for reproducibility

## Jurisdiction

Exclusive jurisdiction: Tel Aviv-Yafo courts, under Israeli law.
