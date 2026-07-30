import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    /* Section 4.5 tactile feedback. Hover-lift is opt-in per variant -- ghost keeps no lift.
       The `disabled:active:translate-y-0` cancels the press animation on disabled buttons. */
    const base =
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-accent/50 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";
    const variants = {
      primary: "bg-accent text-white hover:bg-teal-700 hover:-translate-y-px shadow-sm hover:shadow",
      secondary: "bg-stone-900 text-white hover:bg-stone-800 hover:-translate-y-px shadow-sm hover:shadow",
      outline: "border border-border bg-surface hover:bg-stone-50 text-foreground hover:-translate-y-px",
      ghost: "hover:bg-stone-100 text-foreground",
    };
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
  }
);
Button.displayName = "Button";
