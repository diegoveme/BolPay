import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface AsyncOption {
  value: string;
  label: string;
}

interface AsyncSelectProps {
  label: string;
  value: string;
  onChange: (value: string, option: AsyncOption | null) => void;
  /** Fetch matching options for the typed query (server-side search). */
  fetchOptions: (search: string) => Promise<AsyncOption[]>;
  /**
   * Optional synthetic option appended to the menu (e.g. "invite this email").
   * Receives the current query and whether the fetch returned any results.
   */
  extraOption?: (query: string, hasResults: boolean) => AsyncOption | null;
  placeholder?: string;
  hint?: string;
  emptyText?: string;
}

/**
 * Searchable single-select with server-side lookup (typeahead). The user types
 * a name/email and the backend returns the top matches, so it scales to any
 * directory size without loading everything into a native <select>.
 */
export function AsyncSelect({
  label,
  value,
  onChange,
  fetchOptions,
  extraOption,
  placeholder,
  hint,
  emptyText = 'No results',
}: AsyncSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AsyncOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest fetcher without retriggering the debounce effect (parents
  // pass an inline async function, so its identity changes every render).
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;
  const inputId = `combo-${label.replace(/\s+/g, '-').toLowerCase()}`;

  // Debounced lookup while the menu is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchRef
        .current(query.trim())
        .then((opts) => {
          if (!cancelled) {
            setResults(opts);
            setActive(0);
          }
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  // Close when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Results plus the optional synthetic option (e.g. "invite this email").
  const extra = loading
    ? null
    : (extraOption?.(query.trim(), results.length > 0) ?? null);
  const items = extra ? [...results, extra] : results;

  function pick(opt: AsyncOption) {
    onChange(opt.value, opt);
    setQuery(opt.label);
    setOpen(false);
  }

  function clear() {
    onChange('', null);
    setQuery('');
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && items[active]) {
        e.preventDefault();
        pick(items[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="field combo" ref={containerRef}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="combo__control">
        <input
          id={inputId}
          className="field__input"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // Typing over a chosen value invalidates the selection.
            if (value) onChange('', null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            className="combo__clear"
            aria-label="Clear selection"
            onMouseDown={(e) => {
              e.preventDefault();
              clear();
            }}
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <ul className="combo__menu" role="listbox">
          {loading && <li className="combo__msg">Searching…</li>}
          {!loading && items.length === 0 && (
            <li className="combo__msg">{emptyText}</li>
          )}
          {!loading &&
            items.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`combo__option${i === active ? ' active' : ''}${
                  opt.value === value ? ' selected' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                {opt.label}
              </li>
            ))}
        </ul>
      )}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
