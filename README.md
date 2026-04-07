# Asset maintenance

Web app for reporting maintenance issues, assigning technicians, requesting materials, and closing work with manager sign-off.

**Stack:** Next.js (App Router), React 19, Prisma 6, PostgreSQL, NextAuth (credentials), bcrypt.

## Requirements

- Node.js 20+
- A PostgreSQL database ([Neon](https://neon.tech), RDS, or local Postgres)

## Setup

### 1. Install dependencies

```bash
npm install
```

This runs `prisma generate` via `postinstall`.

### 2. Environment variables

The repo includes **`.env.example`** with every variable documented. Copy it to **`.env`** and fill in real values. **Do not commit `.env`** — it is gitignored so passwords and secrets stay local (or only in your host’s secret store).

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (`?sslmode=require` for Neon). |
| `AUTH_SECRET` | Secret for signing sessions. Use a long random value in production (`openssl rand -base64 32`). |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000` locally, your domain in prod). |
| `NEXT_PUBLIC_SITE_URL` | Optional. Used for `metadataBase` / Open Graph. On Vercel, `VERCEL_URL` is used if this is unset. |

### 3. Database schema

Push the Prisma schema to your database (creates tables):

```bash
npx prisma db push
```

### 4. Seed demo data

Creates departments, assets, accounts, and sample tasks:

```bash
npx prisma db seed
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts (after seed)

Password for every account: **`Welcome1!`**

| Role | Login (user id or email) |
|------|---------------------------|
| Floor worker | `user1` or `alice@factory.com` (also `user2`, `user3`) |
| Manager | `manager1` or `bob@factory.com` |
| Technician | `tech1` or `carlos@factory.com` (also `tech2`, `diana@factory.com`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma db push` | Apply schema to DB |
| `npx prisma db seed` | Run `prisma/seed.ts` |
| `npx prisma studio` | Browse data in the GUI |

## Production build

```bash
npm run build
npm run start
```

Set the same env vars on your host. Run migrations/push and seed (or migrate) against the production database before first deploy.

## Deploy (e.g. Vercel)

1. Connect the repo and set `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (your production URL), and optionally `NEXT_PUBLIC_SITE_URL`.
2. Build command: `npm run build` (default).
3. After first deploy, run `npx prisma db push` (or your migration workflow) against the production database, then seed if you want demo data.

## Project layout

- `app/` — routes, layouts, API (`app/api/auth` for NextAuth).
- `lib/` — Prisma client, auth, queries, server actions, helpers.
- `prisma/schema.prisma` — data model.
- `prisma/seed.ts` — demo users and tasks.
- `middleware.ts` — protects app routes (auth).

