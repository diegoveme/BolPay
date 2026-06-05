# Requirements Specification

This document defines the functional and non-functional requirements for BolPay.
Each requirement has a unique identifier so it can be referenced from design
documents, the roadmap, and test plans.

- Functional requirements use the pattern `FR-<area>-<number>`.
- Non-functional requirements use the pattern `NFR-<area>-<number>`.
- Priority is expressed as **Must**, **Should**, or **Could** (MoSCoW).

---

## 1. Functional Requirements

### 1.1 User Management (USR)

| ID | Requirement | Priority |
|---|---|---|
| FR-USR-01 | The system shall allow registration and authentication scoped by role (company, freelancer, fixed employee, administrator). | Must |
| FR-USR-02 | The system shall require a connected Stellar wallet before a user can perform any on-chain operation. | Must |
| FR-USR-03 | The system shall support a company profile and a professional (freelancer) profile. | Must |
| FR-USR-04 | The system shall allow companies to invite users by email. | Should |
| FR-USR-05 | The system shall allow a user to view and update their own profile information. | Should |

### 1.2 Contracts (CON)

| ID | Requirement | Priority |
|---|---|---|
| FR-CON-01 | The system shall allow a company to create a contract with a title, description, total amount, milestones, deadlines, and expected deliverables. | Must |
| FR-CON-02 | The system shall manage the contract lifecycle through the states `draft`, `accepted`, `active`, and `completed`. | Must |
| FR-CON-03 | The system shall allow a freelancer to accept, reject, or request modifications to a contract. | Must |
| FR-CON-04 | The system shall automatically create and fund the escrow when a contract is accepted. | Must |
| FR-CON-05 | The system shall mark a contract as completed when all of its milestones are approved and released. | Must |

### 1.3 Milestones and Deliverables (MIL)

| ID | Requirement | Priority |
|---|---|---|
| FR-MIL-01 | The system shall allow a company to define milestones with deadlines and assigned amounts. | Must |
| FR-MIL-02 | The system shall allow a freelancer to submit deliverables as files, links, and versions. | Must |
| FR-MIL-03 | The system shall allow a company to review a deliverable and approve it or request changes. | Must |
| FR-MIL-04 | The system shall automatically release the milestone funds on-chain when the deliverable is approved. | Must |
| FR-MIL-05 | The system shall preserve the history of deliverable versions submitted for each milestone. | Should |

### 1.4 Escrow (ESC)

| ID | Requirement | Priority |
|---|---|---|
| FR-ESC-01 | The system shall create an escrow automatically through Trustless Work when a contract is accepted. | Must |
| FR-ESC-02 | The system shall fund the escrow from the company wallet. | Must |
| FR-ESC-03 | The system shall keep funds locked until the corresponding milestone is approved. | Must |
| FR-ESC-04 | The system shall release funds on-chain directly to the freelancer wallet. | Must |
| FR-ESC-05 | The system shall record the Stellar transaction hash for every escrow operation. | Must |

### 1.5 Disputes (DIS)

| ID | Requirement | Priority |
|---|---|---|
| FR-DIS-01 | The system shall allow either the company or the freelancer to open a dispute on a milestone. | Must |
| FR-DIS-02 | The system shall pause the milestone and lock its funds while a dispute is open. | Must |
| FR-DIS-03 | The system shall allow both parties to attach evidence and comments to a dispute. | Must |
| FR-DIS-04 | The system shall support mutual resolution of a dispute between the parties. | Must |
| FR-DIS-05 | The system shall allow escalation of an unresolved dispute to an administrator. | Must |
| FR-DIS-06 | The system shall execute the agreed resolution on the escrow. | Must |

### 1.6 Payroll (PAY)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-01 | The system shall allow a company to create payroll schedules with weekly, biweekly, or monthly frequency. | Must |
| FR-PAY-02 | The system shall allow assignment of individual amounts per recipient (fixed employees or external wallets). | Must |
| FR-PAY-03 | The system shall require the payroll escrow to be funded before execution. | Must |
| FR-PAY-04 | The system shall distribute payments automatically to each wallet on the scheduled date. | Must |
| FR-PAY-05 | The system shall maintain an execution history with the Stellar transaction hash of each distribution. | Must |
| FR-PAY-06 | The system shall notify recipients of a successful payment. | Should |

### 1.7 Notifications (NOT)

| ID | Requirement | Priority |
|---|---|---|
| FR-NOT-01 | The system shall deliver real-time notifications for deliverable approval, change requests, dispute opening, payment release, and payroll execution. | Must |
| FR-NOT-02 | The system shall allow a user to view their notification history. | Should |

### 1.8 Activity Logs (LOG)

| ID | Requirement | Priority |
|---|---|---|
| FR-LOG-01 | The system shall automatically log events for contract creation, milestone approval, payment release, dispute opening, and payroll execution. | Must |
| FR-LOG-02 | The system shall allow authorized users to view the activity log relevant to their contracts and payroll. | Should |

---

## 2. Non-Functional Requirements

### 2.1 Security (SEC)

| ID | Requirement | Priority |
|---|---|---|
| NFR-SEC-01 | The system shall enforce role-based access control on every protected operation. | Must |
| NFR-SEC-02 | The system shall never store private keys; signing is performed through the user's connected wallet. | Must |
| NFR-SEC-03 | The system shall transmit all client-server traffic over encrypted channels (TLS). | Must |
| NFR-SEC-04 | The system shall validate and sanitize all external input on the backend. | Must |

### 2.2 Reliability (REL)

| ID | Requirement | Priority |
|---|---|---|
| NFR-REL-01 | The system shall record an on-chain transaction hash as the source of truth for each settled operation. | Must |
| NFR-REL-02 | The system shall handle Trustless Work and Stellar service failures gracefully, retrying or surfacing actionable errors. | Must |
| NFR-REL-03 | The system shall ensure scheduled payroll executes idempotently, avoiding duplicate distributions. | Must |

### 2.3 Performance (PERF)

| ID | Requirement | Priority |
|---|---|---|
| NFR-PERF-01 | The system shall acknowledge user actions in the interface within two seconds under normal load, independently of on-chain confirmation time. | Should |
| NFR-PERF-02 | The system shall process on-chain confirmations asynchronously and update state when they settle. | Must |

### 2.4 Usability (USE)

| ID | Requirement | Priority |
|---|---|---|
| NFR-USE-01 | The web interface shall be responsive across desktop and tablet viewports. | Must |
| NFR-USE-02 | The mobile application shall run on both Android and iOS from a single Flutter codebase. | Must |
| NFR-USE-03 | The system shall present blockchain operations (escrow funding, release) in user-friendly terms while exposing transaction hashes for verification. | Should |

### 2.5 Maintainability (MNT)

| ID | Requirement | Priority |
|---|---|---|
| NFR-MNT-01 | The backend shall be organized into modules aligned with the system's functional areas. | Must |
| NFR-MNT-02 | Shared types and validation schemas shall be centralized to avoid duplication across clients. | Should |
| NFR-MNT-03 | Database schema changes shall be applied through versioned migrations. | Must |

### 2.6 Compatibility (CMP)

| ID | Requirement | Priority |
|---|---|---|
| NFR-CMP-01 | The system shall operate against the Stellar Testnet during development and testing. | Must |
| NFR-CMP-02 | The system shall settle exclusively in USDC. | Must |

---

## 3. Traceability

Each requirement is expected to map to one or more use cases in
[use-cases.md](use-cases.md) and to one or more components in
[architecture.md](architecture.md). Test cases should reference these identifiers
to demonstrate coverage during the functional testing phase described in
[roadmap.md](roadmap.md).
