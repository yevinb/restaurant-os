# RestaurantOS

Multi-tenant restaurant SaaS — reservations, CRM, loyalty, marketing, analytics, staff scheduling, AI assistant, and Stripe billing.

## Quick start

### 1. Start the database

In a separate terminal:

```bash
cd restaurant-os
npx prisma dev
```

This starts a local Postgres instance (default port `51214`).

### 2. Install and seed

```bash
npm install
npm run db:setup
```

### 3. Run the app

```bash
npm run dev
```

Open **http://localhost:8080**

## Demo login

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Owner | owner@demo.restaurant   | demo1234  |

The seed creates **The Golden Fork** restaurant with 30 customers, 50 reservations, loyalty rules, and a **Pro** plan (all features unlocked).

## Features

| Module | Description |
|--------|-------------|
| **Reservations** | Day/week views, create/edit/cancel, table assignment, spend on complete → loyalty points |
| **CRM** | Customer profiles, tags (VIP/Regular/Inactive), visit history, delete |
| **Loyalty** | Editable reward rules, redeem points, transaction ledger |
| **Marketing** | Segment campaigns, automation rules, Resend email (or demo console mode) |
| **Analytics** | Revenue, bookings, customer trends |
| **Staff** | Weekly shift calendar with notes |
| **AI Assistant** | OpenAI-powered (Pro) with rule-based fallback |
| **Billing** | Stripe checkout + demo upgrade mode |
| **Settings** | Restaurant profile, team invites |

## Plan limits

| Feature | Starter | Growth | Pro |
|---------|---------|--------|-----|
| Reservations/month | 100 | Unlimited | Unlimited |
| CRM | Basic | Full | Full |
| Loyalty | — | ✓ | ✓ |
| Marketing | — | ✓ | ✓ |
| AI Assistant | — | — | ✓ |
| Staff seats | 5 | 20 | Unlimited |

Upgrade plans from **Dashboard → Billing** (demo mode works without real Stripe keys).

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_URL` — App URL (`http://localhost:8080`)
- `NEXTAUTH_SECRET` — Random secret for JWT sessions
- `STRIPE_SECRET_KEY` — Use `sk_test_placeholder` for demo billing
- `OPENAI_API_KEY` — Optional; enables GPT-powered assistant
- `RESEND_API_KEY` — Optional; sends real marketing emails

## Scripts

```bash
npm run dev          # Dev server on :8080
npm run build        # Production build
npm run db:setup     # Push schema + seed
npm run db:seed      # Re-seed demo data
```

## Auth

- **Register** — Creates restaurant + owner account
- **Login** — Email/password via NextAuth JWT
- **Forgot password** — `/forgot-password` (reset link logged to server console in dev)
- **Team invite** — Settings → invite staff with temporary password

## Architecture

- **Next.js 14** App Router + TypeScript + TailwindCSS
- **PostgreSQL** + Prisma 7 with `@prisma/adapter-pg`
- **NextAuth v4** — JWT sessions (no Prisma adapter for credentials)
- Multi-tenant: all data scoped by `restaurantId` via `withTenant()` middleware
- Roles: `OWNER`, `MANAGER`, `STAFF`

## Production deployment

1. Set real `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
2. Configure Stripe keys and price IDs
3. Optionally add `OPENAI_API_KEY` and `RESEND_API_KEY`
4. Run `npm run build && npm start`
5. Set up Stripe webhook to `/api/stripe/webhook`

Deploy targets: Vercel, Railway, Docker, or any Node.js host.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login 401 | Ensure `NEXTAUTH_SECRET` is set and DB is running |
| DB connection error | Run `npx prisma dev` in a separate terminal |
| 404 on routes | Run `npm run dev` from `restaurant-os/` directory |
| Seed fails | Check `DATABASE_URL` and run `npm run db:setup` |
