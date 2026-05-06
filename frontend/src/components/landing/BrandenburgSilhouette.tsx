/** Decorative gate silhouette — low contrast on dark CTA. */
export function BrandenburgSilhouette({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 360 100"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 92V28h12v64H20zm22 0V20h10v72H42zm18 0V12h8v80H60zm14 0V8h6v84H74zm12 0V4h40v88H86zm48 0V4h6v84h-6zm14 0V8h8v80h-8zm18 0V12h8v80H166zm22 0V20h10v72h-10zm22 0V28h12v64h-12z" />
      <path d="M128 92V56h104v36H128zm-92 0V72h24v20H36z" opacity="0.85" />
      <path d="M300 92V28h12v64h-12zm22 0V20h10v72h-10z" />
    </svg>
  );
}
