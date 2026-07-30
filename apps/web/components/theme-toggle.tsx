"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("agentpatch:theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * ThemeToggle -- sits at the bottom of the light/modern sidebar.
 * Theme-aware (bg-background in light, bg-surface-soft in dark) with a
 * hover that lifts to surface-soft/surface. Visible label is plain prose
 * ("Light mode" / "Dark mode") for context, while the aria-label remains
 * authoritative for screen readers.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = readStoredTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("agentpatch:theme", next);
    }
  }

  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {theme === "light" ? (
        <Moon className="h-3.5 w-3.5 text-muted" aria-hidden />
      ) : (
        <Sun className="h-3.5 w-3.5 text-muted" aria-hidden />
      )}
      <span>{theme === "light" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
