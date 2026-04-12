"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getAICostAnalytics, CostAnalytics } from "@/lib/actions/super-admin/financials";
import { formatINRDecimal } from "@/lib/utils";
import {
  Cpu,
  TrendingDown,
  DollarSign,
  Zap,
  Shield,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────
// Simple Bar Chart Component
// ─────────────────────────────────────────────

function BarChart({ data, height = 200 }: { data: { label: string; value: number; value2?: number }[]; height?: number }) {
  const maxValue = Math.max(...data.flatMap((d) => [d.value, d.value2 || 0]), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <div
            className="w-full rounded-t transition-all hover:opacity-80"
            style={{
              height: `${(item.value / maxValue) * (height - 24)}px`,
              backgroundColor: "hsl(217, 91%, 60%)",
            }}
          />
          {item.value2 !== undefined && (
            <div
              className="w-full rounded-t transition-all hover:opacity-80"
              style={{
                height: `${(item.value2 / maxValue) * (height - 24)}px`,
                backgroundColor: "hsl(160, 84%, 39%)",
              }}
            />
          )}
          <span className="text-xs text-text-muted truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Line Chart Component
// ─────────────────────────────────────────────

function LineChart({ data, height = 200 }: { data: { label: string; value: number; value2?: number; value3?: number }[]; height?: number }) {
  if (data.length < 2) {return <div className="h-[200px] flex items-center justify-center text-text-muted">Not enough data</div>;}

  const maxValue = Math.max(...data.flatMap((d) => [d.value, d.value2 || 0, d.value3 || 0]), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 100,
    y2: d.value2 !== undefined ? 100 - (d.value2 / maxValue) * 100 : undefined,
    y3: d.value3 !== undefined ? 100 - (d.value3 / maxValue) * 100 : undefined,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathD2 = points.filter((p) => p.y2 !== undefined).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathD3 = points.filter((p) => p.y3 !== undefined).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="hsl(222, 30%, 18%)" strokeWidth="0.5" />
        ))}
        <path d={pathD} fill="none" stroke="hsl(217, 91%, 60%)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pathD2 && (
          <path d={pathD2} fill="none" stroke="hsl(160, 84%, 39%)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
        {pathD3 && (
          <path d={pathD3} fill="none" stroke="hsl(38, 92%, 50%)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-text-muted">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pie Chart Component
// ─────────────────────────────────────────────

function PieChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90;
  const paths = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const radius = size / 2 - 10;
    const cx = size / 2;
    const cy = size / 2;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: d.color,
      label: d.label,
      value: d.value,
      percentage: ((d.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} stroke="hsl(222, 47%, 9%)" strokeWidth="2" className="hover:opacity-80 transition-opacity cursor-pointer" />
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
            <span className="text-sm text-text-secondary">{p.label}</span>
            <span className="text-sm text-text-primary font-medium">{p.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-danger/50 bg-danger-bg/20" : ""}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${highlight ? "bg-danger/20" : "bg-surface-2"}`}>
          <Icon className={`h-5 w-5 ${highlight ? "text-danger" : "text-text-secondary"}`} />
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Main AI Cost Monitor Tab
// ─────────────────────────────────────────────

export function AICostMonitorTab() {
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: thirtyDaysAgo.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    };
  });


  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAICostAnalytics(dateRange.from, dateRange.to);
      if (result.success) {
        setAnalytics(result.data);
      } else if (result.code === "FORBIDDEN") {
        setError("AI Cost data is only available to Super Admin");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-warning-bg border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-warning" />
          <p className="text-sm text-warning">
            <strong>Internal Use Only:</strong> AI Cost data is confidential and not visible to schools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="h-24 animate-skeleton rounded bg-surface-2" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="h-64 animate-skeleton rounded bg-surface-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-warning-bg border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-warning" />
          <p className="text-sm text-warning">
            <strong>Internal Use Only:</strong> AI Cost data is confidential.
          </p>
        </div>
        <Card className="border-danger/50">
          <CardContent className="p-6">
            <p className="text-danger">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {return null;}

  // Prepare chart data
  const trendData = analytics.trend.slice(-30).map((t) => ({
    label: t.date.slice(5),
    value: t.totalCost,
    value2: t.geminiCost,
    value3: t.claudeHaikuCost,
  }));

  const schoolCostData = analytics.topSchools.slice(0, 10).map((s) => ({
    label: s.schoolName.slice(0, 10),
    value: s.totalCost,
  }));

  const modelCostData = Object.entries(analytics.byModel).map(([model, cost], i) => {
    const colors = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)"];
    return { label: model.split("-")[0], value: cost, color: colors[i % colors.length] };
  });

  const gradeTierData = Object.entries(analytics.byGradeTier).map(([tier, cost], i) => {
    const colors = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(280, 67%, 60%)"];
    return { label: tier, value: cost, color: colors[i % colors.length] };
  });

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-warning-bg border border-warning/30 rounded-lg p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-warning" />
        <p className="text-sm text-warning">
          <strong>Internal Use Only:</strong> AI Cost data is confidential and not visible to schools.
          All costs are in INR with 6 decimal precision for calculations.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">From:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className="h-9 rounded-lg border border-border bg-surface-1 px-3 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">To:</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className="h-9 rounded-lg border border-border bg-surface-1 px-3 text-sm"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total AI Spend"
          value={formatINRDecimal(analytics.totalSpend, 4)}
          subtitle="In selected date range"
          icon={DollarSign}
          highlight
        />
        <StatCard
          title="Monthly Spend"
          value={formatINRDecimal(analytics.monthlySpend, 4)}
          subtitle="Projected monthly cost"
          icon={BarChart3}
        />
        <StatCard
          title="Daily Average"
          value={formatINRDecimal(analytics.dailySpend, 4)}
          subtitle="Average daily cost"
          icon={TrendingDown}
        />
        <StatCard
          title="Cache Savings"
          value={formatINRDecimal(analytics.cacheSavings, 4)}
          subtitle="Cost saved through caching"
          icon={Zap}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total AI Spend Trend */}
        <Card>
          <CardHeader>
            <CardTitle>AI Cost Trend</CardTitle>
            <CardDescription>Daily AI spend over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(217,91%,60%)]" />
                <span className="text-sm text-text-secondary">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(160,84%,39%)]" />
                <span className="text-sm text-text-secondary">Gemini</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(38,92%,50%)]" />
                <span className="text-sm text-text-secondary">Claude Haiku</span>
              </div>
            </div>
            <LineChart data={trendData} height={200} />
          </CardContent>
        </Card>

        {/* Cost by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>Distribution of AI spend across models</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart data={modelCostData} size={160} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 Schools by Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Schools by AI Cost</CardTitle>
            <CardDescription>Highest AI spending schools in the period</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={schoolCostData} height={200} />
          </CardContent>
        </Card>

        {/* Cost by Grade Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Grade Tier</CardTitle>
            <CardDescription>AI spend distribution by class level</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart data={gradeTierData} size={160} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost per 1000 Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Cost per 1000 Queries</CardTitle>
            <CardDescription>Average AI cost efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-text-primary">
                {formatINRDecimal(analytics.avgCostPerQuery * 1000, 4)}
              </p>
              <p className="text-sm text-text-muted mt-2">per 1000 queries</p>
            </div>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
            <CardDescription>Percentage of queries served from cache</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-success">30%</p>
              <p className="text-sm text-text-muted mt-2">estimated cache hit rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Tracking</CardTitle>
            <CardDescription>Schools over budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-text-primary">
                {analytics.topSchools.filter((s) => s.budgetLimit && s.budgetUsed > s.budgetLimit).length}
              </p>
              <p className="text-sm text-text-muted mt-2">schools over budget</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-School AI Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Per-School AI Cost Breakdown</CardTitle>
          <CardDescription>Detailed AI cost analysis for each school</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Gemini Cost</TableHead>
                <TableHead>Claude Haiku</TableHead>
                <TableHead>Claude Sonnet</TableHead>
                <TableHead>Queries</TableHead>
                <TableHead>Cost/Query</TableHead>
                <TableHead>Budget Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.topSchools.map((school) => {
                const overBudget = school.budgetLimit && school.budgetUsed > school.budgetLimit;
                return (
                  <TableRow key={school.schoolId}>
                    <TableCell className="font-medium">{school.schoolName}</TableCell>
                    <TableCell className="text-danger font-medium">
                      {formatINRDecimal(school.totalCost, 4)}
                    </TableCell>
                    <TableCell>{formatINRDecimal(school.geminiCost, 4)}</TableCell>
                    <TableCell>{formatINRDecimal(school.claudeHaikuCost, 4)}</TableCell>
                    <TableCell>{formatINRDecimal(school.claudeSonnetCost, 4)}</TableCell>
                    <TableCell>{school.queryCount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{formatINRDecimal(school.costPerQuery, 4)}</TableCell>
                    <TableCell>
                      {school.budgetLimit ? (
                        <Badge variant={overBudget ? "danger" : "success"}>
                          {overBudget ? "Over Budget" : "Within Budget"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Budget</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
