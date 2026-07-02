const OLD = [
  'Agreements over email or chat, with no formal standing',
  'Manual transfers, with delays',
  'Zero traceability for each payment',
  'Core-team payroll with no automation',
];

const NEW = [
  'Contracts with milestones, deadlines and deliverables',
  'Funds locked in escrow on acceptance',
  'A transaction hash for every operation',
  'On-chain payroll on the scheduled date',
];

/** Problem section: a before/after comparison of agreements without vs. with BolPay. */
export function ProblemSection() {
  return (
    <section id="problema">
      <div className="wrap">
        <div className="sec-head reveal from-left">
          <div className="sec-eye">The problem</div>
          <h2>Agreements live in the chat. The money lives in uncertainty.</h2>
          <p className="sec-sub">
            Today deals are closed over chat, with no guarantees, and payments are manual and
            untraceable. BolPay brings contracts, milestones and payments together in a single escrow.
          </p>
        </div>
        <div className="vs reveal">
          <div className="vs-col old">
            <span className="vs-tag o">Today · no guarantees</span>
            {OLD.map((t) => (
              <div className="vs-item" key={t}>
                <span className="mk">✕</span>
                {t}
              </div>
            ))}
          </div>
          <div className="vs-mid" />
          <div className="vs-col new">
            <span className="vs-tag n">With BolPay</span>
            {NEW.map((t) => (
              <div className="vs-item" key={t}>
                <span className="mk">✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
