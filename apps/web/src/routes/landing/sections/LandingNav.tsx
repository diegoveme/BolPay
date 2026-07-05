import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../data';

/** Sticky top navigation: brand, section anchors and the sign-in button. */
export function LandingNav() {
  return (
    <nav>
      <div className="wrap nav-in">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="" aria-hidden="true" />
          BolPay
        </div>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <Link to="/login" className="btn">
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
}
