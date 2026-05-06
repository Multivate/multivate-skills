export function MiniSparkline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 36"
      className={className}
      aria-hidden
      width={120}
      height={36}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="0,28 18,22 36,26 54,12 72,18 90,8 108,14 120,6"
      />
    </svg>
  );
}
