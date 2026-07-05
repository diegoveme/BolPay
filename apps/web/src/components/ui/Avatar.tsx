/** Avatar: circular image that falls back to the name's initials. */
import { safeHttpUrl } from '@/lib/links';

/** Circular avatar that falls back to the name's initials. */
export function Avatar({
  url,
  name,
  size = 44,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (name ?? '?').trim().slice(0, 2).toUpperCase() || '?';
  // Only render http(s) image URLs (no javascript:/data: from user input).
  const safe = safeHttpUrl(url);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {safe ? <img src={safe} alt="" /> : <span>{initials}</span>}
    </span>
  );
}
