# BolPay - Design System

Minimalist, corporate fintech UI. Calm, trustworthy, precise. The product moves
real money on-chain, so the interface must feel **clear, safe, and deliberate** -
never flashy. Inspired by the brand mark (an Andean alpaca forming a "B").

## Design Principles

1. **Clarity over decoration.** Generous whitespace, strong hierarchy, few colors.
2. **Money is serious.** Amounts, statuses, and irreversible actions are visually
   unambiguous. Destructive/irreversible actions always require a confirmation modal.
3. **Calm surfaces, deliberate accents.** Neutral canvas; color carries meaning
   (status, primary action), not mood.
4. **Consistent, modular components.** Everything composes from the tokens below.

## Color

Light mode is the default. Primary is **Andean blue**. Yellow is a **rare micro
accent only** (the brand yellow is bright - never use it on large surfaces, never as
a primary action; at most a small "pending" dot or a thin highlight, in its muted
gold form).

### Brand & Primary
| Token | Hex | Use |
|---|---|---|
| `primary` | `#1466B8` | Primary actions, links, active states, focus rings. |
| `primary-hover` | `#11589E` | Hover on primary. |
| `primary-active` | `#0E4C88` | Pressed. |
| `primary-subtle` | `#E8F1FA` | Tinted backgrounds, selected rows, info banners. |
| `accent-gold` | `#C99A2E` | **Sparingly** - small pending/highlight marks only. |

### Neutrals (cool slate)
| Token | Hex | Use |
|---|---|---|
| `bg` | `#F7F8FA` | App background. |
| `surface` | `#FFFFFF` | Cards, panels, modals. |
| `surface-2` | `#F1F3F6` | Subtle nested surfaces, table headers. |
| `border` | `#E4E8EC` | Hairline borders, dividers. |
| `text` | `#0F172A` | Primary text. |
| `text-muted` | `#5B6573` | Secondary text, labels. |
| `text-faint` | `#94A3B8` | Placeholders, disabled. |

### Semantic
| Token | Hex | Meaning |
|---|---|---|
| `success` | `#15803D` | Funded, approved, released, paid. |
| `warning` | `#B45309` | Pending, awaiting action, changes requested. |
| `danger` | `#DC2626` | Disputes, rejection, irreversible/destructive. |
| `info` | `#1466B8` | Neutral information (same as primary). |

Status badges use the semantic color at 12% tint background with the solid color
text. Never rely on color alone - always pair with a label.

## Typography

Font: **Inter** (fallback system-ui). Corporate, highly legible at small sizes.

| Role | Size / Weight | Notes |
|---|---|---|
| Display | 30px / 700 | Page titles (rare). |
| H1 | 24px / 700 | Section/page headers. |
| H2 | 19px / 600 | Card titles. |
| H3 | 16px / 600 | Sub-sections. |
| Body | 14px / 400 | Default. |
| Small | 13px / 400 | Secondary. |
| Caption | 12px / 500 | Labels, badges (uppercase, +0.04em tracking). |
| Mono | 13px | Stellar addresses, tx hashes, amounts in tables (tabular-nums). |

Monetary values use tabular figures and an explicit `USDC` suffix.

## Layout & Spacing

- 8px spacing scale: `4, 8, 12, 16, 24, 32, 48, 64`.
- Max content width `1200px`; comfortable gutters.
- App shell: fixed left **sidebar nav** (logo top), top bar (page title, search,
  notifications bell, account menu), scrollable content.
- Cards: `surface`, `1px border`, `radius-lg`, `16–24px` padding, no heavy shadows.

## Radius & Elevation

| Token | Value |
|---|---|
| `radius-sm` | 6px |
| `radius-lg` | 8px (default for cards, inputs, buttons) |
| `radius-pill` | 999px (badges, avatars) |
| `shadow-sm` | `0 1px 2px rgba(15,23,42,.06)` |
| `shadow-md` | `0 8px 24px rgba(15,23,42,.10)` (modals, popovers) |

Avoid large drop shadows. Depth comes from borders and subtle elevation.

## Core Components

- **Buttons:** `primary` (solid blue), `secondary` (white, border), `ghost` (text),
  `danger` (solid red - only for irreversible/destructive). Sizes sm/md. 8px radius.
- **Inputs / Select / Textarea:** white, 1px border, 8px radius, clear focus ring
  (`primary` 2px). Inline validation text in `danger`.
- **Status badge:** pill, semantic tint + label (e.g. `Draft`, `Pending`, `Active`,
  `Funded`, `Released`, `Disputed`, `Completed`).
- **Card / Panel:** titled container for grouped content.
- **Data table:** `surface-2` header, hairline row dividers, right-aligned numeric
  columns (mono), row hover, empty state with icon + message.
- **Stat tile:** label + large value + small delta/sub-label (dashboards).
- **Stepper / Milestone timeline:** vertical list with status dots; current step
  emphasized in `primary`.
- **Tabs, Breadcrumbs, Pagination:** quiet, underlined/active in `primary`.
- **Toast & Notification item:** left status accent, title, body, timestamp.
- **Avatar:** circular; the alpaca logo for the brand, initials for users.

## Modals (critical)

Centered dialog, `surface`, `radius-lg`, `shadow-md`, dimmed backdrop, max ~480px.
Header (title) · body (clear consequence text) · footer (right-aligned: secondary
"Cancel" + primary/danger confirm).

**Every irreversible / on-chain / money-moving action MUST open a confirmation modal
that states the consequence and the amount before proceeding:**

- Accept contract (deploys escrow)
- Fund escrow / fund payroll (locks funds)
- Approve milestone (**releases USDC to the freelancer**)
- Open dispute / resolve dispute (executes on-chain outcome)
- Execute payroll (distributes USDC to all recipients)
- Cancel/archive payroll with refund
- Reject contract · Revoke invitation

Confirm buttons for money-moving actions are `danger` or `primary` with the amount
echoed in the button label (e.g. "Release 500 USDC").

## Imagery & Tone

Logo used as the brand avatar (sidebar, login). No stock photos. Iconography: simple
line icons, 1.5px stroke. Microcopy is plain and reassuring ("Funds are locked in
escrow until you approve.").

## Accessibility

WCAG AA contrast. Focus visible on every interactive element. Status never conveyed
by color alone. Modals trap focus and close on Esc/backdrop (except while a
money-moving request is in flight).
