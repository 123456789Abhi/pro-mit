/**
 * Super Admin Command Center Page
 * Platform-wide monitoring, analytics, and alert management dashboard.
 *
 * Features:
 * - 9 metric sections (Platform, Financial, Engagement, AI, Content, School Health, Notifications, System, Trends)
 * - 30 alerts across 4 severity tiers
 * - Date range filter with custom picker
 * - School ranking table
 * - Action panel for resolving alerts
 *
 * Architecture:
 * - Server Component by default (data fetching)
 * - "use client" only for interactive elements (date picker, alert actions)
 * - All dates in IST, all currency in INR
 */

import { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { getCommandCenterData } from "@/lib/actions/super-admin/command-center";
import { CommandCenterShell } from "./components/command-center-shell";

export const metadata: Metadata = {
  title: "Command Center | Super Admin",
  description: "Platform-wide monitoring and analytics dashboard",
};

// Default date range: last 30 days
function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d: Date) =>
    formatInTimeZone(d, "Asia/Kolkata", "yyyy-MM-dd");

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

interface PageProps {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

export default async function CommandCenterPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Use URL params if provided, otherwise default to last 30 days
  const dateRange = {
    startDate: params.startDate ?? getDefaultDateRange().startDate,
    endDate: params.endDate ?? getDefaultDateRange().endDate,
  };

  const result = await getCommandCenterData(dateRange);

  if (!result.success) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-6 text-center">
          <p className="text-lg font-medium text-danger">Failed to load dashboard</p>
          <p className="mt-2 text-sm text-text-secondary">{result.error}</p>
        </div>
      </div>
    );
  }

  return <CommandCenterShell data={result.data} dateRange={dateRange} />;
}
