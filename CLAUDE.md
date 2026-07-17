@AGENTS.md

# CLAUDE.md — KUARC RadioTrack Project Guide

## 📌 Project Overview
**RadioTrack** is a borrowing/returning management system for radio
communication equipment, built for **KUARC** (Kasetsart University Amateur
Radio Club).

A previous version was built on base44 (no-code) and failed for two
reasons — keep both in mind while building:
1. The admin had to manually enter/manage every borrow record.
2. External borrowers (other clubs, outside individuals) couldn't discover
   or use the site, so they fell back to messaging the club's LINE.

This rebuild fixes both: self-service requests (member and external), and a
public browse page that doesn't require login or discovery friction.

Target: ~1 month, built in phases. Owner is comfortable with Python/Excel but
not deeply experienced with React/TypeScript yet — favor clear, working,
well-commented code over cleverness.

**MVP scope:** brands catalog and history/audit log are intentionally cut for
now — core borrow/return flow first.

---

## Tech Stack & Architecture
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS (utility classes, responsive)
- **Database:** PostgreSQL (hosted on Supabase, free tier — used as DB host only, not Supabase Auth/RLS)
- **ORM:** Prisma
- **Authentication:** NextAuth.js / Auth.js — Google OAuth (@ku.th or personal Gmail), RBAC: ADMIN vs MEMBER
- **Email:** Resend (transactional email for pickup reminders)
- **Scheduling:** Vercel Cron (daily reminder job)
- **Deployment:** Vercel

External borrowers never touch NextAuth — they use a public form with no
account, so their flow is unaffected by auth provider choices.

---

## User Model — Two Tiers

1. **Club members** — NextAuth login (Google, @ku.th or Gmail). Role is
   MEMBER or ADMIN. Logged-in members borrow directly — no manual admin
   entry needed.
2. **External borrowers** (other clubs, outside individuals) — **no
   account**. They:
   - View /radios (public, no auth) to see what's available.
   - Submit /borrow-request (name, org, contact, radio, dates) →
     creates a PENDING record for admin review.

Admins see both member and external requests in one queue
(/admin/borrows). Access control (member-only / admin-only routes) is
enforced server-side via the NextAuth session — there's no Postgres RLS
since Prisma talks to the DB directly, so route/action-level checks matter.

---

## Prisma Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  MEMBER
  ADMIN
}

enum BorrowerType {
  MEMBER
  EXTERNAL
}

enum BorrowStatus {
  PENDING
  APPROVED
  RETURNED
  REJECTED
  OVERDUE
}

enum RadioStatus {
  AVAILABLE
  BORROWED
  MAINTENANCE
}

model User {
  id            String         @id @default(cuid())
  name          String?
  email         String?        @unique
  emailVerified DateTime?
  image         String?
  studentId     String?
  phone         String?
  role          Role           @default(MEMBER)
  accounts      Account[]
  sessions      Session[]
  borrowRecords BorrowRecord[]
  createdAt     DateTime       @default(now())
}

// Standard NextAuth Prisma adapter models — generate with
// `npx auth prisma` or copy from the Auth.js Prisma adapter docs.
model Account { /* NextAuth adapter fields */ }
model Session { /* NextAuth adapter fields */ }
model VerificationToken { /* NextAuth adapter fields */ }

model Radio {
  id            String         @id @default(cuid())
  code          String         @unique   // e.g. R001
  model         String?
  status        RadioStatus    @default(AVAILABLE)
  note          String?
  createdAt     DateTime       @default(now())
  borrowRecords BorrowRecord[]
}

model BorrowRecord {
  id               String       @id @default(cuid())
  radioId          String
  radio            Radio        @relation(fields: [radioId], references: [id])

  borrowerType     BorrowerType @default(MEMBER)
  userId           String?
  user             User?        @relation(fields: [userId], references: [id])
  externalName     String?
  externalOrg      String?
  externalContact  String?
  email            String?      // reminder target — from User or form

  status           BorrowStatus @default(PENDING)
  requestedAt      DateTime     @default(now())
  pickupAt         DateTime?    // scheduled pickup appointment
  dueAt            DateTime?
  returnedAt       DateTime?
  returnNote       String?

  reminderSent     Boolean      @default(false)
}
```

---

## Project Structure (App Router)

```text
app/
  (auth)/              # login (NextAuth) — members only
  radios/              # PUBLIC: browse radios, no login required
    [id]/              # detail + "Borrow" button
  borrow-request/      # PUBLIC: external borrower form (no account)
  (dashboard)/         # protected — requires session
    dashboard/         # member/admin overview
    my-borrows/        # member's own borrow history + return
    admin/
      radios/          # CRUD on radio inventory
      borrows/         # approve/reject queue (member + external)
  api/
    auth/[...nextauth]/
    cron/send-reminders/  # Vercel Cron target
  layout.tsx
  page.tsx
components/
  ui/                  # Buttons, Modals, Badges
  radios/              # RadioCard, StatusBadge
  dashboard/           # StatsCard, etc.
lib/
  prisma.ts            # Prisma client singleton
  auth.ts              # NextAuth config & session helpers
  resend.ts            # email client
  utils.ts
prisma/
  schema.prisma
types/
```

---

## Borrow Flow

1. Logged-in member clicks "Borrow" on /radios/[id] → record created
   directly (borrowerType = MEMBER, status = PENDING).
   A visitor without a session is routed to /borrow-request instead
   (borrowerType = EXTERNAL).
2. Admin reviews /admin/borrows, approves/rejects, sets pickupAt.
   On approval, Radio.status → BORROWED.
3. On return (member self-serves from /my-borrows, or admin marks it for
   walk-ins), returnedAt is set, Radio.status → AVAILABLE.
4. Records past dueAt and not returned are surfaced as overdue in
   /admin/dashboard — computed from dueAt vs now, not a stored state.

---

## Email Reminder System

- **Resend** sends, **Vercel Cron** schedules (vercel.json cron config
  hitting /api/cron/send-reminders daily).
- Job queries BorrowRecord where pickupAt is tomorrow and
  reminderSent = false.
- Sends: "พรุ่งนี้ท่านมีนัดรับเวลา [pickupAt] กรุณาเตรียมสัญญาและมาให้ตรงเวลา"
  → sets reminderSent = true.
- Needs RESEND_API_KEY in Vercel env vars.

---

## Build Phases (~1 month)

1. **Week 1** — Prisma schema + migrate, NextAuth (Google OAuth) setup, RBAC
   middleware, public /radios page.
2. **Week 2** — Borrow flow for members + /borrow-request external form,
   /my-borrows.
3. **Week 3** — Admin panel: approve/reject queue, radio CRUD, mark
   returned.
4. **Week 4** — Resend + Vercel Cron reminders, testing, deploy, custom
   domain, QR code / LINE OA link for discoverability.

Cut first if time is tight: restricting Google OAuth to @ku.th only —
allow personal Gmail from day one and tighten later if needed.

---

## Notes for Claude Code

- This project pins a Next.js version with breaking API changes vs. training
  data — **read @AGENTS.md** and the local docs in
  node_modules/next/dist/docs/ before writing routing, data-fetching, or
  config code.
- Keep components simple and commented — owner is comfortable with
  Python/Excel but is newer to TypeScript/React.
- No Postgres RLS here (Prisma direct connection) — every admin-only
  mutation must check session.user.role === 'ADMIN' server-side, not just
  hide the button client-side.
- Don't reintroduce base44-style patterns — this should stay plain,
  readable Next.js + Prisma + NextAuth code the owner can read and adjust.
