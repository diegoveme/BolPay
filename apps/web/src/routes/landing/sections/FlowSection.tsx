import { STEPS } from '../data';

/** Flow section: the four-step lifecycle of a contract, from draft to audited. */
export function FlowSection() {
  return (
    <section id="flujo">
      <div className="wrap">
        <div className="sec-head reveal from-left">
          <div className="sec-eye">How it works</div>
          <h2>One payment cycle, guaranteed end to end.</h2>
          <p className="sec-sub">A single escrow backs both milestones and payroll. This is how a contract flows:</p>
        </div>
        <div className="flow">
          {STEPS.map((s, i) => (
            <div
              className={`step reveal${s.released ? ' released' : ''}`}
              key={s.num}
              style={{ ['--i' as string]: String(i) }}
            >
              <div className="step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
              <span className="state">{s.state}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
