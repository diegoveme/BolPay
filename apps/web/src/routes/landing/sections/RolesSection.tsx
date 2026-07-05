import { ROLES } from '../data';

/** Roles section: the three participant types that share a single escrow. */
export function RolesSection() {
  return (
    <section id="roles">
      <div className="wrap">
        <div className="sec-head reveal from-left">
          <div className="sec-eye">Who uses BolPay</div>
          <h2>Three roles, one shared escrow.</h2>
        </div>
        <div className="roles">
          {ROLES.map((r, i) => (
            <div className="role reveal" key={r.title} style={{ ['--i' as string]: String(i) }}>
              <span className="r-ic">{r.icon}</span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
