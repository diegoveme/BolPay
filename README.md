<div align="center">

<img src="assets/logo.png" alt="BolPay" width="120" height="120" />

# BolPay

**Trustless freelance contracting & on-chain payroll on Stellar.**

Formalize agreements, manage milestones, and release payments through real,
programmable escrow - instead of manual transfers and informal chats.

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-7D00FF?logo=stellar&logoColor=white)](https://stellar.org)
[![Trustless Work](https://img.shields.io/badge/Escrow-Trustless%20Work-0A0A0A)](https://www.trustlesswork.com/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/Web-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/Runtime-Bun-000000?logo=bun&logoColor=white)](https://bun.sh)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [System Roles](#system-roles)
- [Core Modules](#core-modules)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Documentation](#documentation)
- [Getting Started](#getting-started)
- [Scope and Constraints](#scope-and-constraints)
- [Status](#status)
- [License](#license)

---

## Overview

BolPay is a platform for managing freelance contracts, international payments, and
recurring payroll between companies and remote workers. It replaces fragmented,
trust-based workflows (email, messaging apps, manual transfers) with a single system
where contracts, milestones, disputes, and payroll all settle against decentralized
escrow on Stellar.

The platform serves two payment models on top of the same escrow infrastructure:

- **Milestone-based contracts** for freelance work - funds are locked on contract
  acceptance and released milestone by milestone upon approval.
- **Recurring payroll** for fixed teams - a funded escrow distributes payments
  automatically to each recipient on a scheduled date.

Every payment settles in **USDC**, a native Stellar asset, providing value stability
and full on-chain traceability for each operation.

## Problem

- Companies and freelancers manage agreements over email or messaging apps with no
  formal guarantees.
- Payments are made manually, with delays and no on-chain traceability.
- There is no single tool that combines contracts, milestones, and payments backed
  by real escrow.
- Companies with fixed teams lack an automated, transparent payroll system.

## System Roles

| Role | Description |
|---|---|
| **Company** | Creates contracts, manages milestones, approves deliverables, and administers payroll. |
| **Freelancer** | Accepts contracts, submits deliverables, and receives payments per milestone. |
| **Fixed Employee** | Receives recurring payments through the payroll module. |

## Core Modules

1. **Authentication & Wallets** - Pollar social login (Google / GitHub / email OTP)
   with custodial Stellar wallets, BolPay JWT sessions, role-based access, and
   email verification via Resend.
2. **Contracts** - Creation with title, description, total amount, milestones,
   deadlines, and deliverables. Lifecycle: `draft → accepted → active → completed`.
   Escrow is funded automatically on acceptance.
3. **Milestones & Deliverables** - Milestone definition with deadlines and amounts,
   versioned deliverable submission, company review, and automatic release on
   approval.
4. **Escrow (Trustless Work + Stellar)** - Automatic escrow creation on acceptance,
   funding from the company wallet, funds locked until approval, on-chain release to
   the freelancer, and a Stellar transaction hash recorded per operation.
5. **Disputes** - Opening by either party, milestone pause and fund lock, evidence
   and comments, mutual resolution or escalation for platform review, and execution
   of the agreed outcome on the escrow.
6. **Payroll (On-Chain)** - Weekly / biweekly / monthly schedules, per-recipient
   amounts, escrow funding, automatic distribution on the scheduled date, and an
   execution history with transaction hashes.
7. **Notifications** - Real-time notifications (SSE) for approvals, change requests,
   disputes, releases, and payroll executions.
8. **Activity Logs** - Automatic, append-only event logging for auditing.

See [docs/architecture.md](docs/architecture.md) for how these modules are
structured and [docs/api-reference.md](docs/api-reference.md) for their endpoints.

## Technology Stack

| Layer | Technology |
|---|---|
| **Web Frontend** | React (Vite) + TanStack Query |
| **Backend** | NestJS (Node.js + TypeScript) + Prisma |
| **Database** | PostgreSQL (Supabase) |
| **Auth & Wallets** | [Pollar](https://pollar.xyz) - social login + custodial Stellar wallets |
| **Transactional Email** | [Resend](https://resend.com) - verification + invitations |
| **Blockchain** | Stellar + Soroban |
| **Escrow** | [Trustless Work](https://www.trustlesswork.com/) (escrow as a service) |
| **Payments** | USDC - native Stellar asset |
| **Tooling** | Bun + Turborepo monorepo |

A detailed description of how these layers communicate is available in
[docs/architecture.md](docs/architecture.md).

## Repository Structure

```
BolPay/
├── apps/
│   ├── backend/        # NestJS API, escrow orchestration, payroll scheduler
│   └── web/            # React web client (Vite)
├── packages/
│   └── shared/         # Shared enums, model contracts, and API types
├── assets/             # Brand assets
├── docs/               # Engineering documentation
└── README.md
```

## Documentation

All engineering documentation lives in the [`docs/`](docs/) directory.

| Document | Description |
|---|---|
| [Documentation Index](docs/README.md) | Entry point and reading guide for all docs. |
| [Architecture](docs/architecture.md) | System architecture, layers, and data flow. |
| [Data Model](docs/data-model.md) | Entity-relationship model of the database. |
| [Authentication](docs/authentication.md) | Auth flow, wallet custody, and email verification. |
| [Escrow and Payments](docs/escrow.md) | Trustless Work and Stellar escrow flows. |
| [API Reference](docs/api-reference.md) | REST API surface grouped by module. |
| [Development](docs/development.md) | Local setup, configuration, and tooling. |
| [Glossary](docs/glossary.md) | Domain and technical terminology. |

## Getting Started

```bash
bun install

# Environment (see .env.example for every variable)
cp .env.example apps/backend/.env   # DB, Pollar, Trustless Work, Stellar, JWT, Resend
cp .env.example apps/web/.env       # VITE_API_URL + VITE_POLLAR_PUBLISHABLE_KEY

# Database (Supabase Postgres)
cd apps/backend && bunx prisma migrate deploy && bunx prisma generate

# Run
bun run --cwd apps/backend dev      # API on http://localhost:3000/api (Swagger: /api/docs)
bun run --cwd apps/web dev          # Web on http://localhost:5173
```

See [docs/development.md](docs/development.md) for the full setup and environment
reference.

**Authentication flow:** the web client signs in with Pollar (Google / GitHub /
email OTP) using the publishable key; Pollar creates a custodial Stellar wallet for
the user. The client then exchanges that identity for a BolPay JWT via
`POST /auth/login` (role selected on first login or taken from an email invitation).
Email addresses are verified by BolPay through Resend.

**Escrow modes:** `ESCROW_MODE=simulated` (default) keeps the full product flow
working without touching the chain; `ESCROW_MODE=trustless_work` performs real
multi-release escrows on Stellar Testnet (requires `TRUSTLESS_WORK_API_KEY` and a
funded `STELLAR_PLATFORM_SECRET` testnet account that signs the escrow XDRs).

## Scope and Constraints

**In scope:**

- Management of three user types: company, freelancer, and fixed employee.
- Responsive web interface.
- Decentralized escrow with Trustless Work on Stellar.
- Automated on-chain payroll module.
- Dispute system with mutual resolution and escalation for platform review.

**Out of scope:**

- Integration with traditional banking institutions.
- Automatic fiat currency conversion.
- Production environment (development and testing only).

## Status

Core platform implemented on the backend and web client: Pollar authentication,
contract lifecycle with automatic escrow funding, milestone deliverables with
on-chain release on approval, disputes (mutual resolution, escalation, on-chain
split), scheduled on-chain payroll, real-time notifications (SSE), and activity
logs.

## License

To be defined.
