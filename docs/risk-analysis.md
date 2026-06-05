# Risk Analysis

This document maintains the risk register for BolPay. Each risk is rated by
probability and impact, scored, and assigned a mitigation plan and an owner.

## 1. Rating Scale

- **Probability** and **Impact** are rated **Low (1)**, **Medium (2)**, or
  **High (3)**.
- **Exposure** is the product of probability and impact (1 to 9). Risks with an
  exposure of 6 or higher are considered high priority.

## 2. Risk Register

| ID | Risk | Probability | Impact | Exposure | Mitigation |
|---|---|---|---|---|---|
| R-01 | Trustless Work API changes or downtime disrupts escrow operations. | Medium | High | 6 | Abstract escrow behind an orchestration service; pin to a known API version; handle failures gracefully with retries and clear errors. |
| R-02 | Stellar Testnet instability or resets affect development and testing. | Medium | Medium | 4 | Treat on-chain references as recoverable; design idempotent operations; document recovery steps for Testnet resets. |
| R-03 | On-chain escrow orchestration is more complex than estimated. | High | High | 9 | Prioritize escrow integration early (Phase 3); build a thin proof of concept before full integration; allocate schedule buffer. |
| R-04 | Coordinating three client targets (web, mobile, backend) causes integration delays. | Medium | Medium | 4 | Centralize shared types and contracts in the shared package; define the API contract before client work begins. |
| R-05 | Payroll distribution double-pays recipients after a partial failure. | Low | High | 3 | Make payroll execution idempotent; track each recipient distribution individually; mark partial runs and resume safely. |
| R-06 | Users cannot provision or fund a Stellar wallet for testing. | Medium | Medium | 4 | Document wallet setup and Testnet funding clearly; verify wallet connection early in onboarding. |
| R-07 | Private key handling is implemented insecurely. | Low | High | 3 | Never store private keys; delegate all signing to the user's wallet; enforce this constraint in code review. |
| R-08 | Scope creep beyond the agreed deliverables. | Medium | Medium | 4 | Maintain a clear scope statement in the project charter; route change requests through explicit approval. |
| R-09 | Dispute resolution rules are ambiguous, leading to contested outcomes. | Medium | Medium | 4 | Define dispute states and resolution types explicitly; require administrator escalation for unresolved cases. |
| R-10 | Asynchronous on-chain confirmation leads to inconsistent UI state. | Medium | Medium | 4 | Acknowledge actions immediately while finalizing state only on confirmation; reconcile against the transaction hash. |

## 3. High-Priority Risks

The risks with an exposure of 6 or higher require active monitoring throughout the
project:

- **R-03 (Exposure 9):** Complexity of on-chain escrow orchestration. This is the
  most significant technical risk and is addressed by front-loading escrow work and
  validating it with an early proof of concept.
- **R-01 (Exposure 6):** Dependency on Trustless Work availability and API
  stability. Mitigated by isolating escrow behind an orchestration service and
  handling failures defensively.

## 4. Monitoring

The risk register is reviewed at the end of each phase (see
[roadmap.md](roadmap.md)). New risks are added as they are identified, and the
probability, impact, and mitigation status of existing risks are updated.
