/**
 * School Rankings Component
 * Displays top 20 schools by engagement score with ranking details.
 */

import { SchoolRanking } from "@/lib/actions/super-admin/command-center";
import { formatINR, formatIndianNumber } from "@/lib/utils";

interface SchoolRankingsProps {
  rankings: SchoolRanking[];
}

export function SchoolRankings({ rankings }: SchoolRankingsProps) {
  if (rankings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-6">
        <h3 className="mb-4 font-medium text-text-primary">School Rankings</h3>
        <div className="py-8 text-center">
          <p className="text-sm text-text-secondary">No ranking data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <div className="border-b border-border p-4">
        <h3 className="font-medium text-text-primary">School Rankings</h3>
        <p className="text-xs text-text-secondary">Top 20 by engagement score</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium uppercase text-text-muted">Rank</th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-text-muted">School</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">Students</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">AI Queries</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">Engagement</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rankings.slice(0, 10).map((school) => (
              <tr key={school.schoolId} className="table-row-hover">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      school.rank <= 3
                        ? school.rank === 1
                          ? "bg-warning/20 text-warning"
                          : school.rank === 2
                            ? "bg-text-muted/20 text-text-muted"
                            : "bg-yellow-100 text-warning-700"
                        : "bg-surface-2 text-text-secondary"
                    }`}
                  >
                    {school.rank}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">{school.schoolName}</td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  {formatIndianNumber(school.studentCount)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  {formatIndianNumber(school.aiQueries)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-primary">
                  {formatINR(school.revenue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${
                          school.engagement >= 80
                            ? "bg-success"
                            : school.engagement >= 50
                              ? "bg-warning"
                              : "bg-danger"
                        }`}
                        style={{ width: `${school.engagement}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-medium text-text-primary">
                      {school.engagement.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-lg ${
                      school.trend === "up"
                        ? "text-success"
                        : school.trend === "down"
                          ? "text-danger"
                          : "text-text-muted"
                    }`}
                  >
                    {school.trend === "up" ? "↑" : school.trend === "down" ? "↓" : "→"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rankings.length > 10 && (
        <div className="border-t border-border p-3 text-center">
          <button className="text-xs text-brand hover:underline">
            View all {rankings.length} schools →
          </button>
        </div>
      )}
    </div>
  );
}
