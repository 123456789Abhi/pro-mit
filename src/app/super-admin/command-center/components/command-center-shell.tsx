"use client";

/**
 * Command Center Shell
 * Main client component that orchestrates the dashboard.
 * Contains:
 * - Date range picker
 * - Primary KPI cards
 * - Metrics grid
 * - Alert sidebar
 * - Actions panel
 * - School ranking table
 */

import { useState, useCallback } from "react";
import { CommandCenterData } from "@/lib/actions/super-admin/command-center";
import { DateRangePicker } from "./date-range-picker";
import { KPICards } from "./kpi-cards";
import { MetricsGrid } from "./metrics-grid";
import { AlertFeed } from "./alert-feed";
import { ActionsPanel } from "./actions-panel";
import { SchoolRankings } from "./school-rankings";
import { GrowthComparison } from "./growth-comparison";

interface CommandCenterShellProps {
  data: CommandCenterData;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function CommandCenterShell({ data, dateRange }: CommandCenterShellProps) {
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const handleDateRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setSelectedDateRange(range);
    // In a real implementation, this would trigger a URL update to re-fetch data
    // For now, we just update the local state
    const url = new URL(window.location.href);
    url.searchParams.set("startDate", range.startDate);
    url.searchParams.set("endDate", range.endDate);
    window.history.pushState({}, "", url.toString());
    window.location.reload();
  }, []);

  const handleResolveAlert = useCallback((alertId: string, note: string) => {
    // This will be handled by a server action
    console.log("Resolving alert:", alertId, note);
  }, []);

  const handlePauseSchool = useCallback((schoolId: string, reason: string) => {
    console.log("Pausing school:", schoolId, reason);
  }, []);

  const filteredAlerts = data.alerts.filter((alert) => {
    if (severityFilter === "all") {return true;}
    return alert.severity === severityFilter;
  });

  const criticalAlerts = data.alerts.filter((a) => a.severity === "critical").length;
  const highAlerts = data.alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header with date picker */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Command Center</h1>
          <p className="text-sm text-text-secondary">
            Platform monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            startDate={selectedDateRange.startDate}
            endDate={selectedDateRange.endDate}
            onChange={handleDateRangeChange}
          />
        </div>
      </header>

      {/* Alert summary badges */}
      {(criticalAlerts > 0 || highAlerts > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {criticalAlerts > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-danger/20 px-3 py-1 text-sm text-danger">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{criticalAlerts} Critical</span>
            </div>
          )}
          {highAlerts > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-warning/20 px-3 py-1 text-sm text-warning">
              <span className="font-medium">{highAlerts} High Priority</span>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <KPICards data={data.platform} wowGrowth={data.wowGrowth} />

      {/* Main content grid */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left sidebar: Alert feed */}
        <aside className="order-2 lg:col-span-3 lg:order-1">
          <AlertFeed
            alerts={filteredAlerts}
            totalCount={data.alerts.length}
            severityFilter={severityFilter}
            onFilterChange={setSeverityFilter}
            onAlertSelect={setSelectedAlertId}
            selectedAlertId={selectedAlertId}
          />
        </aside>

        {/* Center: Metrics grid */}
        <main className="order-1 lg:col-span-6 lg:order-2">
          <MetricsGrid data={data} />
        </main>

        {/* Right sidebar: Actions panel */}
        <aside className="order-3 lg:col-span-3 lg:order-3">
          <ActionsPanel
            selectedAlertId={selectedAlertId}
            activeImpersonations={data.systemHealth.activeImpersonationSessions}
            onResolveAlert={handleResolveAlert}
            onPauseSchool={handlePauseSchool}
          />
        </aside>
      </div>

      {/* Bottom section: School rankings and growth comparison */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SchoolRankings rankings={data.schoolRankings} />
        <GrowthComparison wow={data.wowGrowth} mom={data.momComparison} />
      </section>
    </div>
  );
}
