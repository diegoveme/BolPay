# BolPay Documentation

This directory contains the planning and engineering documentation for BolPay, a
trustless freelance contracting and on-chain payroll platform built on Stellar.

## How to Read These Documents

The documents are organized to follow the lifecycle of the project, from planning
to technical design. New contributors are recommended to read them in the
following order:

1. [Project Charter](project-charter.md) — Why the project exists, its scope,
   objectives, stakeholders, and high-level constraints.
2. [Requirements](requirements.md) — What the system must do, expressed as
   functional and non-functional requirements.
3. [Use Cases](use-cases.md) — How each role interacts with the system.
4. [Architecture](architecture.md) — How the system is structured and how its
   layers communicate.
5. [Data Model](data-model.md) — How data is modeled and persisted.
6. [Escrow and Payments](escrow.md) — How funds are locked and released through
   Trustless Work on Stellar.
7. [Roadmap](roadmap.md) — When each part of the system is delivered.
8. [Risk Analysis](risk-analysis.md) — What could go wrong and how it is mitigated.
9. [Glossary](glossary.md) — Definitions of domain and technical terms.

## Document Index

| Document | Purpose |
|---|---|
| [project-charter.md](project-charter.md) | Formal project initiation: scope, objectives, stakeholders, constraints. |
| [requirements.md](requirements.md) | Functional and non-functional requirements with identifiers. |
| [use-cases.md](use-cases.md) | Actor-system interactions and use-case diagrams. |
| [architecture.md](architecture.md) | System architecture, components, and data flow. |
| [data-model.md](data-model.md) | Entity-relationship model and table descriptions. |
| [escrow.md](escrow.md) | Escrow lifecycle, payment, and payroll sequence flows. |
| [roadmap.md](roadmap.md) | Delivery phases, milestones, work breakdown, and timeline. |
| [risk-analysis.md](risk-analysis.md) | Risk register with probability, impact, and mitigation. |
| [glossary.md](glossary.md) | Domain and technical terminology. |

## Diagrams

Diagrams in this documentation are written in [Mermaid](https://mermaid.js.org/),
which renders natively on GitHub and most Markdown viewers. No external image
files are required. To edit a diagram, modify the corresponding fenced
` ```mermaid ` block directly inside the document.

## Conventions

- All documentation is written in English.
- Requirement identifiers follow the pattern `FR-<area>-<number>` for functional
  requirements and `NFR-<area>-<number>` for non-functional requirements.
- Monetary values are expressed in USDC unless stated otherwise.
- On-chain references (transaction hashes, escrow identifiers) refer to the
  Stellar Testnet during development.
