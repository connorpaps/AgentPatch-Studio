"use client";

import { useState } from "react";
import { RunFilters } from "@/lib/api";
import { Button } from "./ui/button";

interface RunsFilterProps {
  onChange: (filters: RunFilters) => void;
}

/**
 * RunsFilter -- the engineer's lever panel. Shape: surface card with the
 * same rounded-2xl vocabulary as the rest of the studio. Labels are
 * mono-measured tracked micro-labels (the one named kicker per surface
 * the design system permits on the runs page). Every field carries the
 * teal halo focus ring; the form lives inside a single tonal surface.
 */
export function RunsFilter({ onChange }: RunsFilterProps) {
  const [status, setStatus] = useState("");
  const [requiresReview, setRequiresReview] = useState<string>("");
  const [search, setSearch] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onChange({
      ...(status ? { status } : {}),
      ...(requiresReview ? { requires_review: requiresReview === "true" } : {}),
      ...(search ? { search } : {}),
    });
  }

  function handleReset() {
    setStatus("");
    setRequiresReview("");
    setSearch("");
    onChange({});
  }

  const labelClass =
    "block font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted";
  const fieldClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors duration-150 ease-out focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[140px]">
          <label htmlFor="filter-status" className={labelClass}>
            Status
          </label>
          <select
            id="filter-status"
            name="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="running">Running</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[160px]">
          <label htmlFor="filter-review" className={labelClass}>
            Review
          </label>
          <select
            id="filter-review"
            name="filter-review"
            value={requiresReview}
            onChange={(e) => setRequiresReview(e.target.value)}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="true">Requires review</option>
            <option value="false">Reviewed</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[200px] flex-1">
          <label htmlFor="filter-search" className={labelClass}>
            Search
          </label>
          <input
            id="filter-search"
            name="filter-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Query or output..."
            className={fieldClass}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            Filter
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </form>
  );
}