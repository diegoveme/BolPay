import { safeHttpUrl } from '@/lib/format';
import { Avatar, Badge } from '@/components/ui';

/** Compact card for one contract party (company or freelancer). */
export function PartyMini({
  label,
  name,
  avatarUrl,
  subtitle,
  website,
  skills,
}: {
  label: string;
  name: string;
  avatarUrl?: string | null;
  subtitle?: string;
  website?: string | null;
  skills?: string[];
}) {
  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {label}
      </p>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Avatar url={avatarUrl} name={name} size={48} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 650 }}>{name}</p>
          {subtitle && (
            <p className="muted" style={{ fontSize: 13 }}>
              {subtitle}
            </p>
          )}
          {safeHttpUrl(website) && (
            <a
              href={safeHttpUrl(website)}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
            >
              {website!.replace(/^https?:\/\//, '')}
            </a>
          )}
          {skills && skills.length > 0 && (
            <div
              className="row"
              style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}
            >
              {skills.slice(0, 8).map((s) => (
                <Badge key={s} tone="neutral">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
