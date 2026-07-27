"use client";

import { useState } from "react";
import { RunFilters } from "@/lib/api";
import { Button } from "./ui/button";

interface RunsFilterProps {
  onChange: (filters: RunFilters) => void;
}

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label htmlFor="filter-status" className="text-xs font-medium text-muted">
          Status
        </label>
        <select
          id="filter-status"
          name="filter-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="running">Running</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="filter-review" className="text-xs font-medium text-muted">
          Review
        </label>
        <select
          id="filter-review"
          name="filter-review"
          value={requiresReview}
          onChange={(e) => setRequiresReview(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="true">Requires Review</option>
          <option value="false">Reviewed</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="filter-search" className="text-xs font-medium text-muted">
          Search
        </label>
        <input
          id="filter-search"
          name="filter-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Query or output..."
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" variant="primary">
        Filter
      </Button>
      <Button type="button" variant="outline" onClick={handleReset}>
        Reset
      </Button>
    </form>
  );
}
