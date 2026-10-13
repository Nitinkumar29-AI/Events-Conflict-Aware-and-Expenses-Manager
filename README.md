# Conflict-Aware Events and Expenses Manager

A centralized campus coordination and financial governance platform built for university student clubs and ACM organizing committees. It streamlines event proposals, identifies venue and audience schedule clashes, enforces creator-only editing policies, tracks itemized expenses and receipts, manages semester budgets, and maintains an immutable institutional archive.

---

## 1. Problem & Solution Overview

Campus event planning frequently suffers from fragmented communication between student clubs and central committees:
- **Scheduling Clashes**: Multiple clubs book the same physical venues at identical times or organize competing workshops targeting the same student cohorts.
- **Disorganized Review**: Event proposals, venue bookings, and executive approvals lack a single verifiable workflow.
- **Financial Ambiguity**: Event expenses, paper receipts, and club budget caps are difficult to audit and track against allocated semester funds.

**Conflict-Aware Events and Expenses Manager** unifies these operations into a single role-governed portal. Club representatives submit event proposals and itemized expense claims. The backend scheduling engine detects potential conflicts across venues, turnaround buffers, and audience demographics, flagging them for human review by ACM Core. Once approved, expenses are deducted in real time from semester budget lines using exact decimal arithmetic.

---

## 2. End-to-End System Workflow

```
[Club Representative]              [Conflict Engine]                 [ACM Core / Admin]
        │                                  │                                  │
  1. Create Event (Draft)                  │                                  │
  2. Edit (Creator-Only)                   │                                  │
  3. Submit Proposal ─────────────────────>│ 4. Evaluate Venue, Time &       │
                                           │    Audience Overlap (Jaccard)    │
                                           │    Flags Clashes (Non-Destructive)│
                                           └─────────────────────────────────>│ 5. Review & Adjudicate
                                                                              │    (Verify / Reject / Resolve)
  6. Submit Expense & Receipt ───────────────────────────────────────────────>│ 7. Review & Approve
        │                                                                     │    (Deducts from Budget)
        ▼                                                                     ▼
[Calendar Published] ◄───────────────────────────────────────────── [Audit Logs & Reports]
```

1. **Event Proposal**: A club representative creates an event proposal in `DRAFT` status and submits it for review.
2. **Conflict Detection**: The system evaluates candidate events within temporal proximity. It calculates venue overlaps, turnaround buffer gaps (< 30 min), and audience demographic similarity via Jaccard index.
3. **Human Adjudication**: Conflicts are **never automatically cancelled or rescheduled**. The system flags them with composite severity scores (`0–100`) for ACM Core to acknowledge, resolve, or override.
4. **Expense Submission**: Permitted users submit expenses and upload receipt proofs. Client-side SHA-256 hashing prevents duplicate receipt uploads.
5. **Financial Review**: ACM Core approves or rejects expenses. Approved expenses update category utilization against the semester's budget envelope using exact Decimal arithmetic.
6. **Institutional Memory**: All status transitions generate immutable audit logs. Semesters can be locked against modifications, and audit-ready CSV reports are exportable with formula injection defenses.

---

## 3. Core Capabilities

- **Event Lifecycle & Master Calendar**: Full state machine (`DRAFT` → `SUBMITTED` → `VERIFIED` / `REJECTED` / `CANCELLED`) with interactive FullCalendar views.
- **Conflict Detection Engine**: Detects `VENUE`, `AUDIENCE`, `ORGANIZER`, and `TIGHT_TURNAROUND` clashes using end-exclusive UTC interval math and Jaccard audience cell matching.
- **Creator-Only Editing & Anti-Spoofing**: Only the original creator of a draft/submitted record may edit it. Administrative review actions are strictly segregated from authoring permissions. Session identity is derived exclusively from authenticated tokens.
- **Expense & Receipt Management**: Exact decimal currency handling (`DECIMAL(12, 2)`), client SHA-256 receipt deduplication, and locked-semester tampering protection.
- **Budget Tracking**: Category-level allocations, real-time expenditure run-rates, and deficit warnings.
- **Institutional Archive & Reports**: Historical event queries, immutable audit log explorer, and CSV report downloads sanitized against spreadsheet formula injection.

---

## 4. Roles & Accountability

Access is governed by a strict Role-Based Access Control (RBAC) matrix paired with multi-tenant club ownership boundaries:

| Role | Responsibilities & Permissions |
|---|---|
| `SUPER_ADMIN` | Global governance, budget envelope allocation, audit visibility, full conflict override capability. |
| `ACM_CORE` | Institutional authority: verifies/rejects events, resolves conflicts, approves/rejects expenses, manages allocations, and locks semesters. |
| `ACM_EXEC` | ACM internal operations: drafts and submits ACM events and expenses. Cannot verify events or approve expenses. |
| `CLUB_REP` | External club representative: creates and submits events/expenses **strictly for their assigned club**. Can acknowledge clashes involving their events. |
| `VIEWER` | Read-only access to published calendar events. Restricted from financial, budget, conflict, and administrative management pages. |

> **Record Ownership vs. Administrative Review**: Ordinary edits (updating event details, modifying draft expenses) are restricted strictly to the **original record creator** (`submittedByUserId` / `createdByUserId`). Administrative review actions (`VERIFY_EVENT`, `APPROVE_EXPENSE`, `RESOLVE_CONFLICT`) remain strictly reserved for `ACM_CORE` and `SUPER_ADMIN`.

---

## 5. Technology Stack & Architecture

| Layer | Technology | Primary Responsibility |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4 | Responsive UI, interactive AppShell, dashboard, and calendar. |
| **Calendar & Icons** | FullCalendar v6, Lucide React | Event scheduling views and accessible iconography. |
| **Backend & API** | Next.js Route Handlers, Zod v3 | Request validation, business logic services, and RBAC authorization. |
| **Database & ORM** | PostgreSQL ≥ 15, Prisma ORM v6 | Relational schema, migration versioning, and ACID transactions. |
| **Authentication** | Auth.js (NextAuth v5 beta), `bcryptjs` | JWT session management, password hashing, optional Google OAuth. |
| **Money & Precision** | `decimal.js` / Prisma `Decimal` | Exact monetary calculations (`DECIMAL(12, 2)`). No floating-point math. |
| **Asset Storage** | Cloudinary (with local mock fallback) | Signed receipt binary uploads; cryptographic SHA-256 verification. |

---

## 6. Setup Guide:

Follow these steps to configure and run the project locally on a fresh machine.

### Step 1 — Prerequisites

Ensure the following tools are installed:
- **Node.js**: `v20.x` or `v22.x` LTS ([Download Node.js](https://nodejs.org/))
- **npm**: `v10.x` or higher (bundled with Node.js)
- **PostgreSQL**: `v15` or higher ([Download PostgreSQL](https://www.postgresql.org/download/))
- **Git**: Installed and available in terminal path

### Step 2 — Clone the Repository

Clone the repository and enter the project folder:

```powershell
# Windows PowerShell
git clone https://github.com/manasbhimani/Events-Conflict-Aware-and-Expenses-Manager.git
cd Events-Conflict-Aware-and-Expenses-Manager
```

```bash
# macOS / Linux
git clone https://github.com/manasbhimani/Events-Conflict-Aware-and-Expenses-Manager.git
cd Events-Conflict-Aware-and-Expenses-Manager
```

### Step 3 — Install Dependencies

Install the project dependencies using the lockfile:

```bash
npm install
```

### Step 4 — Configure Local PostgreSQL

1. Ensure your PostgreSQL service is running.
2. Create an empty database named `acm_incursion`:

```powershell
# Using PostgreSQL psql CLI
psql -U postgres -c "CREATE DATABASE acm_incursion;"
```

*Note: Replace `postgres` with your local PostgreSQL superuser name if different.*

### Step 5 — Configure Environment Variables

Create your local `.env` configuration file from the provided template:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Open `.env` and verify the required settings:

```env
# 1. Database Connection (Update with your local PostgreSQL credentials)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/acm_incursion?schema=public"

# 2. Runtime Environment
NODE_ENV="development"

# 3. Application Security & URL
AUTH_SECRET="your-secure-32-character-random-secret-key-goes-here!"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TZ_APP="Asia/Kolkata"
```

> **Environment Variables Reference**:
> - `DATABASE_URL` *(Required)*: PostgreSQL connection pool string. Must start with `postgresql://` or `postgres://`.
> - `AUTH_SECRET` *(Required in production)*: 32+ character key for signing JWT tokens.
> - `NEXT_PUBLIC_APP_URL` *(Required)*: Canonical URL (`http://localhost:3000` for local testing).
> - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` *(Optional)*: OAuth credentials. If omitted, credentials-based login works out of the box.
> - `CLOUDINARY_*` *(Optional)*: Receipt cloud storage credentials. If omitted, the built-in mock handler automatically stores receipt metadata and performs SHA-256 verification locally.

### Step 6 — Prepare the Database

Run these three commands in order to prepare your database schema and demo records:

```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Apply migrations to the fresh database
npm run db:migrate:prod

# 3. Populate minimal demo dataset
npm run db:seed
```

- `npm run db:generate`: Compiles TypeScript types matching the Prisma schema.
- `npm run db:migrate:prod` (or `npx prisma migrate deploy`): Applies the 7 versioned migrations non-destructively.
- `npm run db:seed`: Seeds the 8 demo users, 5 clubs, 7 venues, 6 events, 5 expenses, and intentional conflict pair.

### Step 7 — Start the Application

Start the local Next.js development server:

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser. If port 3000 is occupied, Next.js will automatically select an available port and display it in the terminal output.

To stop the development server, press `Ctrl + C` in your terminal.

---

## 7. Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL service is stopped | Start PostgreSQL service via Windows Services (`services.msc`) or `sudo systemctl start postgresql`. |
| `Authentication failed for user` | Wrong database password in `.env` | Verify your local PostgreSQL password and update the `DATABASE_URL` in `.env`. |
| `database "acm_incursion" does not exist` | Database not created | Run `psql -U postgres -c "CREATE DATABASE acm_incursion;"` before applying migrations. |
| `PrismaClientInitializationError` | Prisma client not generated | Run `npm run db:generate`. |
| `Table '...' does not exist` | Migrations not executed | Run `npm run db:migrate:prod` to apply pending migrations. |
| `Port 3000 is in use` | Another process occupies port 3000 | Specify a custom port: `npm run dev -- -p 3001`. |
| Hydration error on `<Shield />` | Dark Reader browser extension | Disable Dark Reader on `localhost` (extension mutates HTML attributes during SSR). |

---

## 8. Demo Accounts & Walkthrough Guide

All demo accounts are provisioned with the local testing password: **`DemoPassword123!`**  
*(The login page at `/login` provides one-click autofill buttons for each account).*

| Role | Account Email | Demonstration Purpose |
|---|---|---|
| `SUPER_ADMIN` | `superadmin@acm-demo.college.edu` | System governance, global audit log visibility, semester locking. |
| `ACM_CORE` | `core@acm-demo.college.edu` | Verifying/rejecting events, resolving conflicts, approving expenses. |
| `ACM_EXEC` | `exec@acm-demo.college.edu` | Internal ACM proposals and expenses. |
| `CLUB_REP` | `rep.coding@acm-demo.college.edu` | **Coding Club**: creator-only draft event and expense editing demo. |
| `CLUB_REP` | `rep.robotics@acm-demo.college.edu` | **Robotics Club**: approved hardware expense with receipt proof. |
| `CLUB_REP` | `rep.gdsc@acm-demo.college.edu` | **GDSC**: verified workshop and promotional expense. |
| `CLUB_REP` | `rep.ecell@acm-demo.college.edu` | **E-Cell**: submitted pitch event and rejected expense workflow. |
| `VIEWER` | `viewer@acm-demo.college.edu` | Verified calendar viewing; financial and administrative boundary enforcement. |

### Demonstration Script

1. **Role Login & Dashboard (`/login` → `/dashboard`)**:
   - Sign in as `rep.coding@acm-demo.college.edu`. View role-tailored dashboard with pending submissions and schedule timeline.
2. **Creator-Only Editing (`/events`)**:
   - Open draft event *Coding Club CodeSprint Hack Meetup*. As the creator (`rep.coding`), the edit action is available.
   - If signed in as `rep.robotics`, editing is hidden in the UI and blocked by backend policy (`assertCanEditEvent`).
   - Submit the event for review (`SUBMITTED`).
3. **Conflict Detection Engine (`/events/[id]`)**:
   - Open the seeded conflict pair: *Coding Club Technical Hackathon 2026* (`VERIFIED`) and *ACM Technical Workshop on DSA* (`SUBMITTED`).
   - Click **Detect Conflicts**. Observe the detected `VENUE` (LT-1) and `AUDIENCE` (2nd Year CSE/IT) clashes with composite severity scores.
4. **Human Conflict Adjudication (`/conflicts`)**:
   - Sign in as `core@acm-demo.college.edu`. Navigate to `/conflicts`.
   - Inspect side-by-side comparison. Click **Resolve** with a resolution note or **Override**.
   - Note the core rule: **The conflict engine never auto-cancels events**.
5. **Expense Lifecycle & Receipt Proof (`/expenses`)**:
   - Sign in as `rep.coding@acm-demo.college.edu`. Open draft expense *Hackathon Refreshments & Snacks* (₹4,500.00).
   - Submit for approval. Observe client SHA-256 calculation upon receipt upload.
   - Switch to `core@acm-demo.college.edu` and click **Approve Expense**.
6. **Budget Governance (`/budgets`)**:
   - View category allocations and real-time utilization against the ₹50,000 envelope.
7. **Institutional Archive, Notifications & Reports (`/archive`, `/notifications`, `/reports`)**:
   - Inspect notification center and mark alerts as read.
   - Review historical event records and immutable audit logs in `/archive`.
   - Export CSV reports in `/reports` (formula injection sanitized with UTF-8 BOM).

---

## 9. Minimal Demo Dataset Summary

The idempotent seed (`npm run db:seed`) provides a deterministic dataset:

| Entity | Count | Key Details |
|---|:---:|---|
| **Clubs** | 5 | ACM Student Chapter (`ACM`), Coding Club (`CC`), Robotics Club (`RC`), GDSC (`GDSC`), E-Cell (`ECELL`). |
| **Demo Users** | 8 | 1 Super Admin, 1 ACM Core, 1 ACM Exec, 4 Club Reps, 1 Read-Only Viewer. |
| **Venues** | 7 | LT-1, LT-2, Seminar Hall, Auditorium, CS-LAB-1, CS-LAB-2, Open Air Amphitheater. |
| **Semesters** | 2 | Even Semester 2025-26 (*Locked*), Odd Semester 2026-27 (*Active*, ₹50,000 envelope). |
| **Demo Events** | **6** | 1 verified conflict party, 1 submitted overlapping party, 2 verified distinct, 1 submitted distinct, 1 draft. |
| **Demo Expenses** | **5** | 1 Draft (₹4,500), 1 Submitted (₹3,200), 2 Approved (₹5,000, ₹6,500), 1 Rejected with reason (₹4,800). |
| **Conflict Pair** | **1** | Hackathon vs. DSA Workshop on Sept 20, 2026 in LT-1 (`VENUE` and `AUDIENCE` records). |
| **Receipts** | 2 | Attached to approved expenses with cryptographic SHA-256 digests. |
| **Audit Logs** | 7 | Tracking semester locks, budget allocations, event lifecycle, and expense approvals. |

---

## 10. Operational Limitations & Notes

- **Receipt Storage in Local Mode**: When Cloudinary credentials (`CLOUDINARY_*`) are omitted, the application uses mock storage URLs (`https://storage.mock.local/...`) while preserving full client SHA-256 hashing and database metadata tracking.
- **Expected vs. Actual Attendance**: The database records planned/expected attendees for room capacity calculation; actual physical attendance is transparently indicated as unrecorded.
- **Locked Semester Governance**: Locked semesters reject all new events, budget allocations, and expense submissions by architectural design.
- **Google OAuth Domain Restriction**: If Google OAuth is enabled, `ALLOWED_EMAIL_DOMAIN` rejects email addresses outside the specified institutional domain.

---

## 11. Verification & Test Suite

Verify application integrity using the project scripts:

```bash
# Run unit & integration test suite (320 tests)
npm test

# Run TypeScript type check
npx tsc --noEmit

# Compile production build
npm run build
```

### Directory Structure

```
├── prisma/
│   ├── schema.prisma            # Relational database schema
│   ├── migrations/              # 7 versioned PostgreSQL migrations
│   └── seed.ts                  # Idempotent minimal demo seed script
├── src/
│   ├── app/                     # Next.js App Router (pages & API routes)
│   ├── components/              # Shared white-theme UI components & AppShell
│   └── server/
│       ├── config/              # Environment schema & validation
│       ├── lib/                 # Prisma client, auth, timezone, errors
│       ├── policies/            # RBAC and creator ownership predicates
│       ├── repositories/        # Database access layer
│       ├── services/            # Domain logic (events, conflicts, expenses, budgets)
│       └── validators/          # Zod request validation schemas
└── tests/
    ├── unit/                    # Fast logic tests (RBAC, conflict math, money)
    └── integration/             # Database, API routes, and deployment tests
```

---

## 12. Submission Note

This repository contains the complete source code, test suites, database migrations, and operational documentation for the **Conflict-Aware Events and Expenses Manager**. All instructions have been structured and verified to enable reproducible setup and evaluation on any local machine.
