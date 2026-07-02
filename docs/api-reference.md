# API Reference

The backend exposes a REST API under the global prefix **`/api`**. Interactive
documentation (Swagger / OpenAPI) is served at **`/api/docs`** when the backend is
running.

## Conventions

- **Auth:** every route requires a `Authorization: Bearer <JWT>` header except those
  marked _Public_.
- **Roles:** routes annotated with a role are restricted via `RolesGuard`.
- **Format:** request and response bodies are JSON. Monetary amounts are strings with
  up to 7 decimals (USDC).

## Auth

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Verify the Pollar wallet, register on first login, and return a JWT + user. |
| `GET` | `/auth/me` | Authenticated | Return the current user with profiles and wallets. |

## Users

| Method | Path | Access | Description |
|---|---|---|---|
| `PATCH` | `/users/me/company-profile` | Company | Update the company profile. |
| `PATCH` | `/users/me/freelancer-profile` | Freelancer | Update the freelancer profile. |
| `GET` | `/users/freelancers` | Company | List freelancers in the company directory. |
| `GET` | `/users/employees` | Company | List fixed employees. |
| `POST` | `/users/invitations` | Company | Create an email invitation (sent via Resend). |
| `GET` | `/users/invitations` | Company | List sent invitations. |
| `DELETE` | `/users/invitations/:id` | Company | Revoke an invitation. |
| `GET` | `/users/:id` | Authenticated | Get a user by id. |

## Contracts

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/contracts` | Company | Create a contract (draft) with milestones. |
| `GET` | `/contracts` | Authenticated | List contracts visible to the caller. |
| `GET` | `/contracts/:id` | Authenticated | Get a contract with milestones. |
| `PATCH` | `/contracts/:id` | Company | Update a contract before acceptance. |
| `POST` | `/contracts/:id/send` | Company | Send the contract to the freelancer for acceptance. |
| `POST` | `/contracts/:id/accept` | Freelancer | Accept the contract (deploys the escrow). |
| `POST` | `/contracts/:id/reject` | Freelancer | Reject the contract. |
| `POST` | `/contracts/:id/request-changes` | Freelancer | Request changes with a note. |

## Milestones

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/milestones/:id` | Authenticated | Get a milestone with deliverables. |
| `POST` | `/milestones/:id/deliverables` | Freelancer | Submit a deliverable (new version). |
| `POST` | `/milestones/:id/approve` | Company | Approve the milestone and release funds. |
| `POST` | `/milestones/:id/request-changes` | Company | Request changes on the latest deliverable. |

## Escrows

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/escrows` | Authenticated | List escrows related to the caller. |
| `GET` | `/escrows/:id` | Authenticated | Get an escrow with balances and status. |

## Disputes

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/disputes` | Company / Freelancer | Open a dispute on a milestone. |
| `GET` | `/disputes` | Authenticated | List disputes visible to the caller. |
| `GET` | `/disputes/:id` | Authenticated | Get a dispute with evidence. |
| `POST` | `/disputes/:id/evidence` | Party | Add evidence (file / comment). |
| `POST` | `/disputes/:id/escalate` | Party | Escalate the dispute for platform review. |
| `POST` | `/disputes/:id/resolve` | Party | Resolve with an agreed outcome. |

## Payrolls

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/payrolls` | Company | Create a payroll schedule with recipients. |
| `GET` | `/payrolls` | Company | List payrolls. |
| `GET` | `/payrolls/:id` | Company | Get a payroll with items and executions. |
| `PATCH` | `/payrolls/:id` | Company | Update a payroll before funding. |
| `POST` | `/payrolls/:id/fund` | Company | Fund the payroll escrow. |
| `POST` | `/payrolls/:id/execute` | Company | Trigger a manual distribution. |
| `POST` | `/payrolls/:id/pause` | Company | Pause a recurring payroll. |
| `POST` | `/payrolls/:id/resume` | Company | Resume a paused payroll. |
| `POST` | `/payrolls/:id/archive` | Company | Archive a payroll. |

## Notifications

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/notifications` | Authenticated | List notifications (also streamed via SSE). |
| `POST` | `/notifications/:id/read` | Authenticated | Mark a notification as read. |
| `POST` | `/notifications/read-all` | Authenticated | Mark all notifications as read. |

## Activity Logs

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/activity-logs` | Authenticated | List the caller's activity. |

## Health

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness probe. |

> This reference reflects the route surface; for exact request/response schemas use
> the live OpenAPI docs at `/api/docs`.
