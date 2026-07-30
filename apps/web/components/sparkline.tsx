interface SparklineProps {
  values: number[];
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  neutralColor?: string;
}

export function Sparkline({
  values,
  height = 28,
  positiveColor = "var(--success)",
  negativeColor = "var(--error)",
  neutralColor = "var(--muted-soft)",
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <div
        className="flex items-center text-xs text-muted"
        style={{ height }}
      >
        No runs yet
      </div>
    );
  }
  const width = values.length * 12;
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {values.map((v, i) => {
        const x = i * 12 + 6;
        const baseY = height - 4;
        const topY = 4;
        const fill = v > 0 ? positiveColor : v < 0 ? negativeColor : neutralColor;
        const y = v === 0 ? baseY : topY + (Math.abs(v) - 1) * 4;
        return (
          <rect
            key={i}
            x={x - 3}
            y={y}
            width={6}
            height={baseY - y}
            rx={2}
            fill={fill}
          />
        );
      })}
    </svg>
  );
}
