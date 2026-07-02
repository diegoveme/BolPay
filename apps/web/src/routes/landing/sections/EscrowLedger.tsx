/** Signature visual: a live escrow contract with milestones being released. */
export function EscrowLedger() {
  return (
    <div className="ledger reveal from-right">
      <div className="ledger-top">
        <span className="lbl">CONTRACT · #BP-0427</span>
        <span className="hash mono">GBQ7…F4XK</span>
      </div>
      <div className="vault">
        <div className="vault-amt mono">
          4,800.00<small>USDC</small>
        </div>
        <span className="vault-tag">Locked in escrow</span>
      </div>
      <div className="ms-list">
        <div className="ms done">
          <span className="ms-ic">✓</span>
          <div className="ms-body">
            <div className="ms-name">UI & flow design</div>
            <div className="ms-meta">Released · tx GA2K…9PLM</div>
          </div>
          <span className="ms-amt mono">1,600</span>
          <span className="ms-state">RELEASED</span>
        </div>
        <div className="ms done">
          <span className="ms-ic">✓</span>
          <div className="ms-body">
            <div className="ms-name">Contracts API</div>
            <div className="ms-meta">Released · tx GC8F…2QRT</div>
          </div>
          <span className="ms-amt mono">1,600</span>
          <span className="ms-state">RELEASED</span>
        </div>
        <div className="ms active">
          <span className="ms-ic">●</span>
          <div className="ms-body">
            <div className="ms-name">Payments integration</div>
            <div className="ms-meta">Delivery submitted · in review</div>
          </div>
          <span className="ms-amt mono">1,600</span>
          <span className="ms-state">REVIEW</span>
        </div>
      </div>
      <div className="ledger-foot">
        <span>2 / 3 milestones released</span>
        <span className="live">
          <span className="pulse" />
          Synced on-chain
        </span>
      </div>
    </div>
  );
}
