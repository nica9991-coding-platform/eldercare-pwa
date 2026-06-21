import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  height?: number;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  height = 52,
  fullWidth = true,
  children,
  style,
  ...rest
}: ButtonProps) {
  const base = {
    height,
    width: fullWidth ? '100%' : undefined,
    borderRadius: height >= 70 ? 18 : 14,
    fontWeight: 700,
    fontSize: height >= 70 ? 19 : 16,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    transition: 'background-color 120ms ease, transform 80ms ease',
  } as const;

  const variantStyle =
    variant === 'primary'
      ? {
          background: 'var(--primary)',
          color: '#fff',
          boxShadow: 'var(--shadow-primary)',
        }
      : variant === 'outline'
        ? {
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '2px solid var(--border-strong)',
          }
        : {
            background: 'transparent',
            color: 'var(--primary)',
            fontWeight: 600,
          };

  return (
    <button
      {...rest}
      style={{ ...base, ...variantStyle, ...style }}
      onMouseDown={(e) => {
        if (variant === 'primary') e.currentTarget.style.background = 'var(--primary-hover)';
      }}
      onMouseUp={(e) => {
        if (variant === 'primary') e.currentTarget.style.background = 'var(--primary)';
      }}
    >
      {children}
    </button>
  );
}
