# Development

This guide covers local setup, configuration, and the day-to-day tooling for working
on BolPay.

## 1. Prerequisites

- [Bun](https://bun.sh) `1.3+` (package manager and runtime)
- A PostgreSQL database (the project targets [Supabase](https://supabase.com))
- Accounts / keys for [Pollar](https://pollar.xyz), [Trustless Work](https://www.trustlesswork.com/),
  and [Resend](https://resend.com) - optional for `simulated` escrow mode

## 2. Install

```bash
bun install
```

The repository is a Bun + Turborepo monorepo; a single install wires up all
workspaces (`apps/backend`, `apps/web`, `packages/shared`).

## 3. Configure

Copy the root example into a local `.env` for each app and fill in the values:

```bash
cp .env.example apps/backend/.env   # DB, Pollar, Trustless Work, Stellar, JWT, Resend
cp .env.example apps/web/.env       # VITE_API_URL + VITE_POLLAR_PUBLISHABLE_KEY
```

### Environment reference

| Variable | App | Purpose |
|---|---|---|
| `PORT`, `NODE_ENV` | backend | Server port and environment. |
| `DATABASE_URL` | backend | Pooled Postgres connection (app). |
| `DIRECT_URL` | backend | Direct Postgres connection (migrations). |
| `POLLAR_API_URL` | backend | Pollar Server API base URL. |
| `POLLAR_SECRET_KEY` | backend | Server-side wallet verification (required in production). |
| `TRUSTLESS_WORK_API_URL` | backend | Trustless Work API base URL. |
| `TRUSTLESS_WORK_API_KEY` | backend | Required for `trustless_work` escrow mode. |
| `ESCROW_MODE` | backend | `simulated` (default) or `trustless_work`. |
| `STELLAR_NETWORK` | backend | `testnet` during development. |
| `USDC_ISSUER` | backend | Issuer of the native Stellar USDC asset. |
| `STELLAR_PLATFORM_SECRET` / `STELLAR_PLATFORM_ADDRESS` | backend | Platform signer for escrow XDRs (testnet). |
| `PAYROLL_CRON` / `PAYROLL_SCHEDULER_ENABLED` | backend | Payroll scheduler tick. |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | backend | Session token signing and lifetime. |
| `RESEND_API_KEY` | backend | Transactional email (verification + invitations). |
| `VITE_API_URL` | web | Backend API base URL. |
| `VITE_POLLAR_PUBLISHABLE_KEY` | web | Client-side Pollar authentication. |

> Secrets are never committed. Only `*.example` files are tracked; real `.env`
> files are git-ignored.

## 4. Database

```bash
cd apps/backend
bunx prisma migrate deploy   # apply migrations
bunx prisma generate         # generate the Prisma client
```

## 5. Run

```bash
# From the repo root (Turborepo runs each app's dev task):
bun run dev

# Or individually:
bun run --cwd apps/backend dev   # API → http://localhost:3000/api (Swagger: /api/docs)
bun run --cwd apps/web dev       # Web → http://localhost:5173
```

## 6. Workspace Scripts

| Command | Description |
|---|---|
| `bun run dev` | Run all apps in development. |
| `bun run build` | Build all workspaces. |
| `bun run lint` | Lint all workspaces. |
| `bun run test` | Run tests. |
| `bun run typecheck` | Type-check all workspaces. |
| `bun run db:generate` | Regenerate the Prisma client. |
| `bun run format` | Format the codebase with Prettier. |

## 7. Escrow Modes for Local Development

Start in **`simulated`** mode (the default): the full product flow - contracts,
milestones, disputes, and payroll - works end to end without a blockchain
connection. Switch to **`trustless_work`** only when you need real on-chain
settlement on the Stellar Testnet, which requires the Trustless Work key and a
funded platform signer. See [escrow.md](escrow.md).
