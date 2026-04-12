"use client";

import { Building2, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatIndianNumber } from "@/lib/utils";

interface SchoolsSummaryProps {
  summary: {
    total: number;
    byStatus: Record<string, number>;
    totalStudents: number;
    avgStudentsPerSchool: number;
  };
}

export function SchoolsSummary({ summary }: SchoolsSummaryProps) {
  const statCards = [
    {
      title: "Total Schools",
      value: summary.total,
      icon: Building2,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Total Students",
      value: formatIndianNumber(summary.totalStudents),
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Active Schools",
      value: summary.byStatus.active ?? 0,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      subtitle: `${summary.byStatus.churned ?? 0} churned`,
    },
    {
      title: "Avg Students/School",
      value: summary.avgStudentsPerSchool,
      icon: Users,
      color: "text-text-secondary",
      bgColor: "bg-surface-2",
    },
  ];

  const statusBadges = [
    { key: "trial", label: "Trial", color: "bg-warning/10 text-warning" },
    { key: "active", label: "Active", color: "bg-success/10 text-success" },
    { key: "frozen", label: "Frozen", color: "bg-surface-2 text-text-muted" },
    { key: "churned", label: "Churned", color: "bg-danger/10 text-danger" },
    { key: "suspended", label: "Suspended", color: "bg-danger/10 text-danger" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="mt-1 text-2xl font-semibold font-display text-text-primary">
                    {card.value}
                  </p>
                  {card.subtitle && (
                    <p className="mt-0.5 text-xs text-text-muted">{card.subtitle}</p>
                  )}
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.bgColor)}>
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <Card className="p-4">
        <p className="mb-3 text-xs font-medium text-text-muted uppercase tracking-wider">
          Schools by Status
        </p>
        <div className="flex flex-wrap gap-2">
          {statusBadges.map((badge) => {
            const count = summary.byStatus[badge.key] ?? 0;
            return (
              <span
                key={badge.key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  badge.color
                )}
              >
                {badge.label}
                <span className="font-semibold">{count}</span>
              </span>
            );
          })}
          {(summary.byStatus.churned ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-danger/10 text-danger">
              <AlertTriangle className="h-3 w-3" />
              {summary.byStatus.churned} need renewal
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
