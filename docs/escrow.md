# Escrow and Payments

This document describes how BolPay locks and releases funds through Trustless Work
on the Stellar network. It covers the escrow lifecycle, the milestone payment flow,
the dispute resolution flow, and the payroll distribution flow. All settlement is
performed in USDC, and every operation produces a Stellar transaction hash that is
stored as the source of truth.

## 1. Principles

- **No custody of keys.** BolPay never stores private keys. Funding and release are
  authorized by the user's connected wallet; the backend only orchestrates the
  operations through Trustless Work.
- **On-chain source of truth.** A settlement is considered final only when its
  Stellar transaction is confirmed. The transaction hash is recorded against the
  corresponding domain entity.
- **Escrow as a Service.** Trustless Work provides the escrow primitives (create,
  fund, release, refund), removing the need to author and audit custom contracts.

## 2. Escrow Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Contract accepted / Payroll defined
    Created --> Funded: Company funds from wallet
    Funded --> Releasing: Milestone approved / Payroll executes
    Releasing --> Released: Stellar confirms release
    Released --> Closed: All funds released
    Funded --> Refunding: Dispute resolved as refund
    Refunding --> Closed: Stellar confirms refund
    Closed --> [*]
```

| State | Meaning |
|---|---|
| `Created` | The escrow exists in Trustless Work but holds no funds. |
| `Funded` | The company has funded the escrow from its wallet. |
| `Releasing` | A release has been requested and is awaiting on-chain confirmation. |
| `Released` | Funds have been released to the recipient and confirmed on Stellar. |
| `Refunding` | A refund has been requested as part of a dispute resolution. |
| `Closed` | The escrow has no remaining funds and is finalized. |

## 3. Milestone Payment Flow

This is the primary flow for freelance contracts: funds are locked at acceptance
and released per milestone upon approval.

```mermaid
sequenceDiagram
    actor Company
    actor Freelancer
    participant API as Backend
    participant TW as Trustless Work
    participant ST as Stellar

    Freelancer->>API: Accept contract
    API->>TW: Create escrow (type = contract)
    Company->>API: Authorize funding
    API->>TW: Fund escrow
    TW->>ST: Submit funding transaction
    ST-->>TW: Confirmed (hash)
    TW-->>API: Funded + tx hash
    API->>API: Contract = active, store hash

    Freelancer->>API: Submit deliverable
    Company->>API: Approve milestone
    API->>TW: Release milestone funds
    TW->>ST: Submit release transaction
    ST-->>TW: Confirmed (hash)
    TW-->>API: Released + tx hash
    API->>API: Milestone = released, store hash
    API->>Freelancer: Notify payment released
```

## 4. Dispute Resolution Flow

When a dispute is opened, the affected milestone is paused and its funds remain
locked until the dispute is resolved. The resolution determines whether funds are
released to the freelancer, refunded to the company, or split.

```mermaid
sequenceDiagram
    actor Party as Company / Freelancer
    actor Admin as Administrator
    participant API as Backend
    participant TW as Trustless Work
    participant ST as Stellar

    Party->>API: Open dispute on milestone
    API->>API: Pause milestone, lock funds
    Party->>API: Attach evidence and comments

    alt Mutual resolution
        Party->>API: Agree on resolution
    else Escalation
        API->>Admin: Escalate dispute
        Admin->>API: Decide resolution
    end

    API->>TW: Execute resolution (release / refund / split)
    TW->>ST: Submit settlement transaction(s)
    ST-->>TW: Confirmed (hash)
    TW-->>API: Settled + tx hash
    API->>API: Dispute = resolved, store hash
```

## 5. Payroll Distribution Flow

Payroll reuses the escrow infrastructure for recurring distributions. The escrow is
funded ahead of time, and the scheduler distributes payments automatically on the
configured date.

```mermaid
sequenceDiagram
    actor Company
    participant SCHED as Payroll Scheduler
    participant API as Backend
    participant TW as Trustless Work
    participant ST as Stellar
    actor Recipient as Recipients

    Company->>API: Create payroll + add recipients
    Company->>API: Fund payroll escrow
    API->>TW: Fund escrow (type = payroll)
    TW->>ST: Submit funding transaction
    ST-->>TW: Confirmed (hash)

    Note over SCHED: Scheduled date reached
    SCHED->>API: Trigger payroll execution
    API->>TW: Distribute to each recipient
    TW->>ST: Submit distribution transactions
    ST-->>TW: Confirmed (hashes)
    TW-->>API: Distribution results + hashes
    API->>API: Record execution, store hashes
    API->>Recipient: Notify payment received
```

## 6. Failure Handling and Idempotency

- **Asynchronous confirmation.** The interface acknowledges actions immediately,
  while settlement is confirmed asynchronously. Domain state that depends on
  settlement is finalized only after on-chain confirmation.
- **Retries.** Transient failures from Trustless Work or Stellar are retried. The
  backend surfaces actionable errors when an operation cannot complete.
- **Idempotent payroll.** Payroll execution is designed so that retrying after a
  partial failure does not double-pay recipients. Each recipient distribution is
  tracked individually, and a failed run can be marked `partial` and safely resumed.

## 7. Networks and Assets

| Aspect | Value |
|---|---|
| Settlement asset | USDC |
| Network (development) | Stellar Testnet |
| Smart contract platform | Soroban (via Trustless Work) |
| Source of truth | Stellar transaction hash per operation |
