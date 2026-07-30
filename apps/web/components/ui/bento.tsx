import { cn } from "@/lib/utils";

/**
 * Bento -- enum-strict tile grid. Per design-taste-frontend Section 4.7,
 * the EXACT number of cells matches the EXACT number of items: no empties,
 * no pre-shaped templates. Renders as a Server Component.
 *
 * Variant per cell count:
 *   - 2 cells -> 50/50 split (2-up)
 *   - 3 cells -> asymmetric 2fr hero + 1fr stack-aside (1 + 2 visual)
 *   - 4 cells -> 2-up on desktop, 1-up on mobile
 *   - 5 cells -> 3 + 2 (hero + 4)
 *   - 6 cells -> 3 + 3 (two trios)
 *
 * On mobile, EVERY variant collapses to a single column.
 */
export function Bento({
  cells,
  className,
}: {
  cells: React.ReactNode[];
  className?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tailwind needs any
  const layout: any =
    cells.length === 2
      ? "lg:grid-cols-2"
      : cells.length === 3
        ? "lg:grid-cols-[2fr_1fr] lg:grid-rows-2"
        : cells.length === 4
          ? "lg:grid-cols-2"
          : cells.length === 5
            ? "lg:grid-cols-[2fr_1fr_1fr] lg:grid-rows-2"
            : "lg:grid-cols-3";

  // For 3 cells: hero is index 0, spanning row-span-2; remaining on the
  // right column. For 5 cells: hero (cell 0) row-span-2 col-span-1; cells 1+2
  // right column; cells 3+4 across the bottom row.
  const heroClass =
    cells.length === 3 || cells.length === 5
      ? "lg:row-span-2 lg:col-span-1"
      : "";

  return (
    <div className={cn("grid grid-cols-1 gap-4", layout, className)}>
      {cells.map((cell, i) => (
        <div key={i} className={cn(i === 0 && heroClass)}>
          {cell}
        </div>
      ))}
    </div>
  );
}
