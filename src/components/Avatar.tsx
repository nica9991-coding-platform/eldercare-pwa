const COLOR_MAP: Record<string, string> = {
  teal: 'var(--primary)',
  terracotta: 'var(--accent)',
  slate: 'var(--text-secondary)',
  gray: 'var(--text-muted-2)',
};

export function Avatar({
  initials,
  color = 'teal',
  size = 46,
}: {
  initials: string;
  color?: 'teal' | 'terracotta' | 'slate' | 'gray';
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: COLOR_MAP[color],
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
