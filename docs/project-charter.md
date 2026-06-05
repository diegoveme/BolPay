# Project Charter

## 1. Project Identification

| Field | Value |
|---|---|
| **Project name** | BolPay |
| **Project type** | Web and mobile platform with decentralized escrow |
| **Sponsor** | Permissionless Escrows Inc. |
| **Document status** | Draft |
| **Last updated** | 2026-06-04 |

## 2. Purpose

BolPay exists to provide a single, trustworthy platform for managing freelance
contracts, international payments, and recurring payroll between companies and
remote workers. The platform replaces informal agreements and manual transfers
with formal contracts backed by decentralized escrow on the Stellar network, using
Trustless Work for escrow orchestration and USDC for settlement.

## 3. Business Justification

Companies and freelancers currently coordinate work over email and messaging apps
and settle payments manually, which produces three recurring problems: lack of
formal guarantees, payment delays, and no traceable record of operations.
Companies with fixed teams additionally lack an automated payroll mechanism. BolPay
addresses these problems by combining contract management, milestone tracking,
dispute resolution, and payroll into one system where every payment is locked in
escrow and released on-chain.

## 4. Objectives

| ID | Objective | Success Measure |
|---|---|---|
| OBJ-1 | Enable formal, milestone-based freelance contracts with escrow funding. | Contracts can be created, accepted, and funded end to end on Stellar Testnet. |
| OBJ-2 | Release funds on-chain only upon milestone approval. | Each approved milestone produces a verifiable Stellar transaction hash. |
| OBJ-3 | Provide an automated on-chain payroll module. | Scheduled payroll distributes to all recipients automatically with recorded hashes. |
| OBJ-4 | Support dispute resolution with escalation. | Disputes can be opened, paused, resolved mutually, or escalated to an administrator. |
| OBJ-5 | Deliver responsive web and cross-platform mobile clients. | Core flows are usable on both the React web app and the Flutter mobile app. |

## 5. Scope

### In Scope

- Role-based management for company, freelancer, fixed employee, and administrator.
- Responsive web interface (React) and cross-platform mobile application (Flutter).
- Decentralized escrow with Trustless Work on Stellar.
- Automated on-chain payroll module with configurable frequency.
- Dispute system with mutual resolution and administrator escalation.
- Real-time notifications and automatic activity logging.

### Out of Scope

- Integration with traditional banking institutions.
- Automatic fiat currency conversion.
- End-user manuals and external documentation.
- Formal staff training.
- Production environment; only development and testing environments are delivered.

## 6. Stakeholders

| Stakeholder | Role / Interest |
|---|---|
| Permissionless Escrows Inc. | Project sponsor and recipient of the final source code. |
| Business advisor | Reviews and signs off on the final acceptance. |
| Development team | Designs, builds, and tests the platform. |
| Companies (end users) | Create contracts and administer payroll. |
| Freelancers (end users) | Accept contracts and receive milestone payments. |
| Fixed employees (end users) | Receive recurring payroll payments. |
| Administrators (operators) | Monitor escrows and resolve escalated disputes. |

## 7. High-Level Deliverables

### Planning Deliverables

- Project Charter (this document)
- Requirements specification
- Use-case diagram
- Entity-relationship diagram
- Architecture diagram
- Wireframes / mockups
- Gantt chart
- Work breakdown structure (WBS)
- Risk analysis

### Execution Deliverables

- Complete source code (React web, Flutter mobile, NestJS backend)
- Configured PostgreSQL database with applied migrations
- Trustless Work integration with functional escrow on Stellar Testnet
- Operational payroll module with automatic on-chain distribution
- Functional testing of contracts, payments, and escrows in a test environment

### Final Deliverables

- Source code delivered to Permissionless Escrows Inc.
- Signed closing meeting minutes
- Release or acceptance letter from the business advisor

## 8. Key Constraints

- Settlement is performed exclusively in USDC on Stellar.
- A connected Stellar wallet is mandatory to operate within the platform.
- Escrow behavior depends on the Trustless Work service and Stellar Testnet
  availability.
- The project targets development and testing environments only.

## 9. Key Assumptions

- Trustless Work exposes a stable API for escrow creation, funding, and release
  throughout the project.
- Stellar Testnet remains available and functional for development and testing.
- End users are able to provision and fund a Stellar wallet with test USDC.

## 10. High-Level Risks

A complete risk register is maintained in [risk-analysis.md](risk-analysis.md).
The most significant risks at initiation are dependency on third-party blockchain
services, the complexity of on-chain escrow orchestration, and the coordination
overhead of delivering three client targets (web, mobile, backend) in parallel.
