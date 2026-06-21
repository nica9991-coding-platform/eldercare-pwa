type IconProps = { size?: number; color?: string };

export function CheckIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CapsuleIcon({ size = 28, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="18" height="6" rx="3" stroke={color} strokeWidth={2} />
      <path d="M12 9v6" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function OfflineIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M8.5 8.5A8 8 0 0 1 19 12M5 12a8 8 0 0 1 1.5-2.3M9 16a4 4 0 0 1 5.5-.4M12 19h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 22, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertCircleIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <path d="M12 8v5M12 16h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export function LeafIcon({ size = 48 }: IconProps) {
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">🌿</span>;
}

export function SunsetIcon({ size = 22 }: IconProps) {
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">🌅</span>;
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="var(--border-strong)" strokeWidth={2} fill="none" />
      <circle cx="20" cy="8" r="4" fill="var(--primary)" />
      <circle cx="10.5" cy="26" r="4" fill="var(--primary)" />
      <circle cx="29.5" cy="26" r="4" fill="var(--accent)" />
    </svg>
  );
}
