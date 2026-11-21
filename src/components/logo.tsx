type Props = {
  size?: number;
  className?: string;
};

/**
 * Marca da aplicação: bilhete de rifa com perfuração em menta.
 * Usa os tokens do tema para acompanhar qualquer ajuste de paleta.
 */
export function Logo({ size = 40, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="48" height="48" rx="14" fill="var(--color-brand-600)" />

      <g
        transform="translate(6 6) scale(1.5)"
        stroke="white"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      </g>

      <g
        transform="translate(6 6) scale(1.5)"
        stroke="var(--color-accent-500)"
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        <path d="M13 5v2" />
        <path d="M13 11v2" />
        <path d="M13 17v2" />
      </g>
    </svg>
  );
}
