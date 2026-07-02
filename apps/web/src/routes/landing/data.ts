/** Content for the landing page, kept separate so sections stay presentational. */

export type Module = {
  n: string;
  icon: string;
  title: string;
  body: string;
  accent: 'violet' | 'lumen' | 'amber' | 'usdc';
};

export const MODULES: Module[] = [
  { n: '01', icon: '🔑', title: 'Access & wallets', body: 'Login with a Stellar wallet (non-custodial), JWT sessions and role-based access.', accent: 'violet' },
  { n: '02', icon: '📄', title: 'Contracts', body: 'Title, amount, milestones, deadlines and deliverables. A draft-to-completed lifecycle.', accent: 'violet' },
  { n: '03', icon: '🪜', title: 'Milestones & deliveries', body: 'Versioned deliverables, company review and release on approval.', accent: 'lumen' },
  { n: '04', icon: '🔒', title: 'Escrow', body: 'Signed deployment and funding, locked funds and on-chain release.', accent: 'violet' },
  { n: '05', icon: '⚖️', title: 'Disputes', body: 'Opened by either party, milestone paused, evidence and mutual resolution.', accent: 'amber' },
  { n: '06', icon: '🗓️', title: 'On-chain payroll', body: 'Weekly, biweekly or monthly schedules with automatic distribution on the due date.', accent: 'lumen' },
  { n: '07', icon: '🔔', title: 'Notifications', body: 'Real-time alerts for approvals, changes, disputes and releases.', accent: 'usdc' },
  { n: '08', icon: '🧾', title: 'Activity log', body: 'An automatic, write-only event log, ready to audit.', accent: 'violet' },
];

export type Step = {
  num: string;
  title: string;
  body: string;
  state: string;
  released?: boolean;
};

export const STEPS: Step[] = [
  { num: 'STEP 01', title: 'The contract is created', body: 'The company defines the title, total amount, milestones, deadlines and deliverables.', state: 'draft' },
  { num: 'STEP 02', title: 'The escrow is locked', body: 'On acceptance, the company funds the escrow by signing with its wallet and the funds are locked.', state: 'accepted' },
  { num: 'STEP 03', title: 'Released per milestone', body: 'The freelancer delivers, the company approves and signs, and the payment is released on-chain.', state: 'active', released: true },
  { num: 'STEP 04', title: 'Closed and audited', body: 'Every operation is recorded with its transaction hash on Stellar.', state: 'completed' },
];

export type Role = { icon: string; title: string; body: string };

export const ROLES: Role[] = [
  { icon: '🏢', title: 'Company', body: 'Creates contracts, manages milestones, approves deliverables and runs payroll for the core team.' },
  { icon: '💻', title: 'Freelancer', body: 'Accepts contracts, submits deliverables and receives the payment released for each approved milestone.' },
  { icon: '👤', title: 'Full-time employee', body: 'Receives recurring payments through the payroll module, on the scheduled date.' },
];

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: '#problema', label: 'The problem' },
  { href: '#flujo', label: 'How it works' },
  { href: '#modulos', label: 'Modules' },
  { href: '#roles', label: 'Roles' },
];
