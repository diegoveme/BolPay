# Glossary

Domain and technical terms used across BolPay's documentation and code.

| Term | Definition |
|---|---|
| **Activity log** | Append-only record of a domain event (e.g. registration, wallet link) kept for auditing. |
| **Company** | Role that creates contracts, approves deliverables, and runs payroll. |
| **Contract** | Agreement between a company and a freelancer, composed of milestones with a total amount. |
| **Custodial wallet** | A Stellar wallet whose keys are managed on the user's behalf by Pollar. |
| **Deliverable** | A versioned submission (file and/or link) attached to a milestone for review. |
| **Dispute** | A contested milestone that pauses release and locks funds until resolved. |
| **Escrow** | A Trustless Work (Soroban) contract that locks funds until release conditions are met. |
| **Escrow mode** | Runtime setting (`simulated` or `trustless_work`) selecting how settlement is performed. |
| **Fixed employee** | Role paid through recurring payroll rather than per-contract milestones. |
| **Freelancer** | Role that accepts contracts, submits deliverables, and receives milestone payments. |
| **Invitation** | A tokenized email that binds an address to a role until accepted or expired. |
| **JWT** | JSON Web Token issued by the backend to authorize API requests after Pollar login. |
| **Milestone** | An ordered, independently releasable unit of work within a contract. |
| **Multi-release escrow** | An escrow that releases funds in tranches (one per milestone). |
| **Payroll** | A recurring payment schedule distributing USDC to multiple recipients. |
| **Payroll execution** | A single run of a payroll that distributes funds and records transactions. |
| **Pollar** | Wallet-onboarding SDK for Stellar; provides authentication and custodial wallets. |
| **Resend** | Transactional email provider used for email verification and invitations. |
| **Soroban** | Stellar's smart-contract platform, on which Trustless Work escrows run. |
| **Stellar** | The layer-1 blockchain network used for settlement. |
| **Testnet** | Stellar's test network used during development (no real value). |
| **Transaction** | An audit record of an on-chain operation with its Stellar hash. |
| **Trustless Work** | Escrow-as-a-service provider offering non-custodial, auditable escrow contracts. |
| **Trustline** | A Stellar ledger entry authorizing an account to hold a given asset (e.g. USDC). |
| **USDC** | A US-dollar stablecoin used as the unit of account; a native asset on Stellar. |
