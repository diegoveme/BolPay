import { MODULES } from '../data';

/** Modules section: a grid of the platform's building blocks. */
export function ModulesSection() {
  return (
    <section id="modulos">
      <div className="wrap">
        <div className="sec-head reveal from-left">
          <div className="sec-eye">System modules</div>
          <h2>Everything a work agreement needs, in one place.</h2>
        </div>
        <div className="mods">
          {MODULES.map((m, i) => (
            <div
              className="mod reveal"
              key={m.n}
              style={{ ['--accent' as string]: `var(--${m.accent})`, ['--i' as string]: String(i) }}
            >
              <div className="mod-n mono">{m.n}</div>
              <span className="mod-ic">{m.icon}</span>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
