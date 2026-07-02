# BolPay Documentation

Engineering documentation for **BolPay**, a trustless freelance contracting and
on-chain payroll platform built on the Stellar network with decentralized escrow
powered by [Trustless Work](https://www.trustlesswork.com/).

## Reading Order

New contributors are recommended to read the documents in this order:

1. [Architecture](architecture.md) - How the system is structured and how its
   layers communicate.
2. [Data Model](data-model.md) - How domain data is modeled and persisted.
3. [Authentication](authentication.md) - Identity, custodial Stellar wallets
   (Pollar), and email verification.
4. [Escrow & Payments](escrow.md) - How funds are locked and released through
   Trustless Work on Stellar.
5. [API Reference](api-reference.md) - REST endpoints exposed by the backend.
6. [Development](development.md) - Local setup, environment variables, and scripts.
7. [Glossary](glossary.md) - Domain and technical terminology.

## Document Index

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | System architecture, components, and data flow. |
| [data-model.md](data-model.md) | Entity-relationship model and table descriptions. |
| [authentication.md](authentication.md) | Auth flow, wallet custody, and email verification. |
| [escrow.md](escrow.md) | Escrow lifecycle, milestone release, and payroll distribution. |
| [api-reference.md](api-reference.md) | REST API surface grouped by module. |
| [development.md](development.md) | Getting started, configuration, and tooling. |
| [glossary.md](glossary.md) | Domain and technical terminology. |

## Conventions

- All documentation is written in English.
- Diagrams use [Mermaid](https://mermaid.js.org/), which renders natively on
  GitHub. Edit the fenced ` ```mermaid ` blocks directly.
- Monetary values are expressed in **USDC** (a native Stellar asset) unless
  stated otherwise.
- On-chain references (transaction hashes, escrow identifiers) refer to the
  **Stellar Testnet** during development.
