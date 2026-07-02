import { Link } from 'react-router-dom';
import { EscrowLedger } from './EscrowLedger';

/** Hero section: headline, lead copy, primary CTAs and the escrow ledger mock. */
export function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">
            <span className="pulse" />
            Programmable escrow · USDC payments on Stellar
          </span>
          <h1 className="title">
            The money stays <span className="lock">locked</span>
            <br />
            until the work is <span className="free">released</span>.
          </h1>
          <p className="lead">
            Freelance contracts and payroll on <b>real escrow on Stellar</b>. Funds are
            locked on acceptance and released milestone by milestone on approval. All in <b>USDC</b>.
          </p>
          <div className="hero-cta">
            <a href="#flujo" className="btn btn-fill">
              See how it works →
            </a>
            <Link to="/login" className="btn">
              Enter BolPay
            </Link>
          </div>
          <div className="trust-row">
            <span>
              <span className="dot" />
              Trustless Work
            </span>
            <span>
              <span className="dot b" />
              USDC settlement
            </span>
            <span>
              <span className="dot g" />
              On-chain release
            </span>
          </div>
        </div>

        <EscrowLedger />
      </div>
    </header>
  );
}
