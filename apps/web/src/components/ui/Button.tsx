/** Button: styled button with variants and a built-in loading spinner. */
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

/** Styled button with variants and a built-in loading spinner. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner spinner--sm" aria-hidden /> : null}
      {children}
    </button>
  );
}
