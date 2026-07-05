import { NAV_LINKS } from '../data';

/** Page footer: brand, the shared section links and a tagline. */
export function LandingFooter() {
  return (
    <footer>
      <div className="wrap foot-in">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="" aria-hidden="true" />
          BolPay
        </div>
        <div className="foot-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="foot-meta">Programmable escrow · USDC on Stellar</div>
      </div>
    </footer>
  );
}
