"use client";

/**
 * Date Range Picker
 * Custom date range selection for filtering dashboard metrics.
 */

import { useState, useCallback } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { subDays, startOfMonth, endOfMonth } from "date-fns";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
}

const IST_TIMEZONE = "Asia/Kolkata";

const PRESET_RANGES: Array<
  | { label: string; days: number }
  | { label: string; days: 0; type: "thisMonth" }
  | { label: string; days: 0; type: "lastMonth" }
> = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", days: 0, type: "thisMonth" },
  { label: "Last month", days: 0, type: "lastMonth" },
];

function formatDateForDisplay(date: Date): string {
  return formatInTimeZone(date, IST_TIMEZONE, "dd MMM yyyy");
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00" + ( IST_TIMEZONE.includes("Kolkata") ? "+05:30" : "+00:00"));
}

function toISODate(date: Date): string {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handlePresetClick = useCallback(
    (preset: (typeof PRESET_RANGES)[number]) => {
      const today = new Date();
      let newStart: Date;
      let newEnd: Date = today;

      if ('type' in preset && preset.type === "thisMonth") {
        newStart = startOfMonth(today);
        newEnd = endOfMonth(today);
      } else if ('type' in preset && preset.type === "lastMonth") {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newStart = startOfMonth(lastMonth);
        newEnd = endOfMonth(lastMonth);
      } else {
        newStart = subDays(today, preset.days);
      }

      onChange({
        startDate: toISODate(newStart),
        endDate: toISODate(newEnd),
      });
      setIsOpen(false);
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    if (customStart && customEnd) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
      });
      setIsOpen(false);
    }
  }, [customStart, customEnd, onChange]);

  const handleClearDates = useCallback(() => {
    setCustomStart("");
    setCustomEnd("");
  }, []);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm transition-colors hover:border-border-hover"
      >
        <svg
          className="h-4 w-4 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-text-primary">
          {formatDateForDisplay(parseDate(startDate))} -{" "}
          {formatDateForDisplay(parseDate(endDate))}
        </span>
        <svg
          className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-surface-1 p-4 shadow-lg">
            {/* Preset ranges */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium uppercase text-text-muted">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-3 hover:text-text-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mb-4 border-t border-border" />

            {/* Custom range */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase text-text-muted">
                Custom Range
              </label>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleClearDates}
                  className="text-xs text-text-muted transition-colors hover:text-text-secondary"
                >
                  Clear
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd}
                    className="rounded-md bg-brand px-3 py-1.5 text-xs text-white transition-colors hover:bg-brand/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
