# BolPay

Trustless freelance contracting and on-chain payroll platform built on the Stellar
network, with decentralized escrow powered by [Trustless Work](https://www.trustlesswork.com/).
Every payment is settled in USDC, providing value stability and full on-chain
traceability for each operation.

BolPay lets companies and remote workers formalize agreements, manage milestones,
and release payments through real, programmable escrow instead of manual transfers
and informal chats.

---

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [System Roles](#system-roles)
- [Core Modules](#core-modules)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Documentation](#documentation)
- [Scope and Constraints](#scope-and-constraints)
- [Status](#status)
- [License](#license)

---

## Overview

BolPay is a web and mobile platform for managing freelance contracts, international
payments, and recurring payroll between companies and remote workers. It replaces
fragmented, trust-based workflows (email, messaging apps, manual PayPal transfers)
with a single system where contracts, milestones, disputes, and payroll all settle
against decentralized escrow on Stellar.

The platform serves two payment models on top of the same escrow infrastructure:

- **Milestone-based contracts** for freelance work, where funds are locked on
  contract acceptance and released milestone by milestone upon approval.
- **Recurring payroll** for fixed teams, where a funded escrow distributes payments
  automatically to each recipient on a scheduled date.

## Problem

- Companies and freelancers manage agreements over email, WhatsApp, or Telegram
  with no formal guarantees.
- Payments are made manually through services such as PayPal, with delays and no
  on-chain traceability.
- There is no centralized tool that combines contracts, milestones, and payments
  backed by real escrow.
- Companies with fixed teams lack an automated, transparent payroll system.

## System Roles

| Role | Description |
|---|---|
| **Company** | Creates contracts, manages milestones, approves deliverables, and administers payroll. |
| **Freelancer** | Accepts contracts, submits deliverables, and receives payments per milestone. |
| **Fixed Employee** | Receives recurring payments through the payroll module. |
| **Administrator** | Oversees the platform, resolves escalated disputes, and monitors escrows. |

## Core Modules

1. **User Management** — Role-based registration and authentication, mandatory
   Stellar wallet connection, company and professional profiles, and email
   invitations.
2. **Contracts** — Contract creation with title, description, total amount,
   milestones, deadlines, and expected deliverables. Lifecycle:
   `draft -> accepted -> active -> completed`. Escrow is funded automatically on
   acceptance.
3. **Milestones and Deliverables** — Milestone definition with deadlines and
   assigned amounts, deliverable submission (files, links, versions), company
   review, and automatic fund release on approval.
4. **Escrow (Trustless Work + Stellar)** — Automatic escrow creation on contract
   acceptance, funding from the company wallet, funds locked until milestone
   approval, on-chain release to the freelancer wallet, and a Stellar transaction
   hash recorded per operation.
5. **Disputes** — Dispute opening by either party, milestone pause and fund lock,
   evidence and comments from both sides, mutual resolution or escalation to an
   administrator, and execution of the agreed resolution on the escrow.
6. **Payroll (On-Chain)** — Payroll schedules with weekly, biweekly, or monthly
   frequency, individual amount assignment per recipient, escrow funding before
   execution, automatic distribution on the scheduled date, execution history with
   Stellar transaction hashes, and payment notifications.
7. **Notifications** — Real-time notifications for deliverable approval, change
   requests, dispute opening, payment release, and payroll execution.
8. **Activity Logs** — Automatic event logging for contract creation, milestone
   approval, payment release, dispute opening, and payroll execution.

See [docs/requirements.md](docs/requirements.md) for the full functional and
non-functional specification.

## Technology Stack

| Layer | Technology |
|---|---|
| **Web Frontend** | React |
| **Mobile Application** | Flutter |
| **Backend** | NestJS (Node.js + TypeScript) |
| **Database** | PostgreSQL |
| **Blockchain** | Stellar + Soroban |
| **Escrow** | Trustless Work (Escrow as a Service) |
| **Payments** | USDC (Circle) on Stellar |

A detailed description of how these layers communicate is available in
[docs/architecture.md](docs/architecture.md).

## Repository Structure

This repository is organized as a monorepo. The application code is scaffolded
separately; the layout below describes the intended target structure.

```
BolPay/
├── apps/
│   ├── backend/        # NestJS API, escrow orchestration, payroll scheduler
│   ├── web/            # React web client
│   └── mobile/         # Flutter mobile application
├── packages/
│   └── shared/         # Shared types, constants, and validation schemas
├── docs/               # Project documentation (see below)
└── README.md
```

## Documentation

All project documentation lives in the [`docs/`](docs/) directory.

| Document | Description |
|---|---|
| [Documentation Index](docs/README.md) | Entry point and reading guide for all docs. |
| [Project Charter](docs/project-charter.md) | Scope, objectives, stakeholders, and constraints. |
| [Requirements](docs/requirements.md) | Functional and non-functional requirements. |
| [Architecture](docs/architecture.md) | System architecture, layers, and data flow. |
| [Data Model](docs/data-model.md) | Entity-relationship model of the database. |
| [Use Cases](docs/use-cases.md) | Role interactions and use-case diagrams. |
| [Escrow and Payments](docs/escrow.md) | Trustless Work and Stellar escrow flows. |
| [Roadmap](docs/roadmap.md) | Delivery phases, milestones, and timeline. |
| [Risk Analysis](docs/risk-analysis.md) | Identified risks and mitigation plans. |
| [Glossary](docs/glossary.md) | Domain and technical terminology. |

## Scope and Constraints

**In scope:**

- Management of four roles: company, freelancer, fixed employee, and administrator.
- Responsive web interface and cross-platform mobile application.
- Decentralized escrow with Trustless Work on Stellar.
- Automated on-chain payroll module.
- Dispute system with mutual resolution and administrator escalation.

**Out of scope:**

- Integration with traditional banking institutions.
- Automatic fiat currency conversion.
- End-user manuals and external documentation.
- Formal staff training.
- Production environment (development and testing only).

## Status

Pre-development. Planning deliverables and documentation are in progress.
Application scaffolding and implementation will follow. See
[docs/roadmap.md](docs/roadmap.md) for the current phase and timeline.

## License

To be defined. The final source code is to be delivered to Permissionless Escrows Inc.
