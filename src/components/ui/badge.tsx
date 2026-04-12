import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-surface-2 text-text-primary border-border",
    success: "bg-success-bg text-success border-success/30",
    warning: "bg-warning-bg text-warning border-warning/30",
    danger: "bg-danger-bg text-danger border-danger/30",
    info: "bg-info-bg text-info border-info/30",
    outline: "bg-transparent text-text-secondary border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
