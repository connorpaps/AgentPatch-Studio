import { cn } from "@/lib/utils";

/**
 * AgentPatchMark — the AgentPatch brand glyph.
 *
 * A simple octagon (eight-sided polygon) outline with a filled inner notch
 * suggesting both 'inspect' and 'patch'. Pure SVG, no external dep,
 * rendered as a Server Component.
 *
 * Per design-taste-frontend Section 4.8, this is the 'single, simple
 * geometric mark' exception -- no hand-rolled illustration.
 */
export function AgentPatchMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // Octagon inscribed in 24x24 viewBox.
  // points clockwise starting at top-left vertex.
  const octagonPoints = [
    [9, 5],
    [15, 5],
    [19, 9],
    [19, 15],
    [15, 19],
    [9, 19],
    [5, 15],
    [5, 9],
  ]
    .map((p) => p.join(","))
    .join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label="AgentPatch"
      className={cn("text-accent", className)}
    >
      <polygon
        points={octagonPoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner inspection notch: a small filled octagon rotated 45deg, off-center. */}
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        rx="1"
        transform="rotate(45 12 12)"
        fill="currentColor"
      />
    </svg>
  );
}
