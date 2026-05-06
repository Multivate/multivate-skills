/** Small purple bar chart for floating “AI & Machine Learning” card. */
export function MiniBarChart({ className }: { className?: string }) {
  const heights = [14, 22, 16, 26, 18, 28, 20];
  const baseY = 36;
  const barW = 7;
  const gap = 5;
  return (
    <svg
      viewBox="0 0 120 40"
      className={className}
      aria-hidden
      width={120}
      height={40}
    >
      {heights.map((h, i) => (
        <rect
          key={i}
          x={6 + i * (barW + gap)}
          y={baseY - h}
          width={barW}
          height={h}
          rx={2}
          className="fill-brand-primary"
        />
      ))}
    </svg>
  );
}
