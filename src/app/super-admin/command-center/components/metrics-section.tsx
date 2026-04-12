"use client";

/**
 * Metrics Section Component
 * Collapsible section wrapper for metric groups.
 */

import { useState, type ReactNode } from "react";

interface MetricsSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function MetricsSection({ title, icon, children, defaultOpen = true }: MetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-surface-1">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-2/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">{icon}</span>
          <h3 className="font-medium text-text-primary">{title}</h3>
        </div>
        <svg
          className={`h-5 w-5 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isOpen && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
