import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-accent text-white hover:bg-teal-700",
      secondary: "bg-stone-900 text-white hover:bg-stone-800",
      outline: "border border-border bg-surface hover:bg-stone-50 text-foreground",
      ghost: "hover:bg-stone-100 text-foreground",
    };
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
  }
);
Button.displayName = "Button";
