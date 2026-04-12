"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getRevenueMetrics, getSchoolRevenues, getRevenueCharts, RevenueMetrics, SchoolRevenue, RevenueChart } from "@/lib/actions/super-admin/financials";
import { formatINR, formatINRDecimal } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Users,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─────────────────────────────────────────────
// Simple Bar Chart Component
// ─────────────────────────────────────────────

function BarChart({ data, height = 200 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <div
            className="w-full rounded-t transition-all hover:opacity-80"
            style={{
              height: `${(item.value / maxValue) * (height - 24)}px`,
              backgroundColor: item.color || "hsl(217, 91%, 60%)",
            }}
          />
          <span className="text-xs text-text-muted truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Simple Line Chart Component
// ─────────────────────────────────────────────

function LineChart({ data, height = 200 }: { data: { label: string; value: number; value2?: number }[]; height?: number }) {
  if (data.length < 2) {return <div className="h-[200px] flex items-center justify-center text-text-muted">Not enough data</div>;}

  const maxValue = Math.max(...data.flatMap((d) => [d.value, d.value2 || 0]), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 100,
    y2: d.value2 !== undefined ? 100 - (d.value2 / maxValue) * 100 : undefined,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathD2 = points.filter((p) => p.y2 !== undefined).map((p, i, arr) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="hsl(222, 30%, 18%)" strokeWidth="0.5" />
        ))}
        {/* Line 1 */}
        <path d={pathD} fill="none" stroke="hsl(217, 91%, 60%)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* Area fill */}
        <path d={`${pathD} L 100 100 L 0 100 Z`} fill="hsl(217, 91%, 60%)" fillOpacity="0.1" />
        {/* Line 2 if present */}
        {pathD2 && (
          <path d={pathD2} fill="none" stroke="hsl(160, 84%, 39%)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-text-muted">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Simple Pie Chart Component
// ─────────────────────────────────────────────

function PieChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(280, 67%, 60%)"];

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
      color: d.color || colors[i % colors.length],
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
  trend,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-brand/50 bg-brand/5" : ""}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.value >= 0 ? "text-success" : "text-danger"}`}>
              {trend.value >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${highlight ? "bg-brand/20" : "bg-surface-2"}`}>
          <Icon className={`h-5 w-5 ${highlight ? "text-brand" : "text-text-secondary"}`} />
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Main Revenue Overview Tab
// ─────────────────────────────────────────────

export function RevenueOverviewTab() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [revenues, setRevenues] = useState<SchoolRevenue[]>([]);
  const [charts, setCharts] = useState<RevenueChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [metricsResult, revenuesResult, chartsResult] = await Promise.all([
          getRevenueMetrics(),
          getSchoolRevenues(),
          getRevenueCharts(
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
            new Date().toISOString().slice(0, 7)
          ),
        ]);

        if (metricsResult.success) {setMetrics(metricsResult.data);}
        if (revenuesResult.success) {setRevenues(revenuesResult.data);}
        if (chartsResult.success) {setCharts(chartsResult.data);}
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
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
      <Card className="border-danger/50">
        <CardContent className="p-6">
          <p className="text-danger">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const mrrTrendData = charts.slice(-12).map((c) => ({
    label: c.month.slice(5),
    value: c.mrr,
  }));

  const revenueVsCostData = charts.slice(-6).map((c) => ({
    label: c.month.slice(5),
    value: c.revenue,
    value2: c.cost,
  }));

  const tierData = [
    { label: "Economy", value: revenues.filter((r) => r.pricingTier === "economy").reduce((sum, r) => sum + r.monthlyRevenue, 0), color: "hsl(160, 84%, 39%)" },
    { label: "Standard", value: revenues.filter((r) => r.pricingTier === "standard").reduce((sum, r) => sum + r.monthlyRevenue, 0), color: "hsl(217, 91%, 60%)" },
    { label: "Premium", value: revenues.filter((r) => r.pricingTier === "premium").reduce((sum, r) => sum + r.monthlyRevenue, 0), color: "hsl(280, 67%, 60%)" },
  ];

  const regionData = [...new Set(revenues.map((r) => r.region))].map((region, i) => ({
    label: region,
    value: revenues.filter((r) => r.region === region).reduce((sum, r) => sum + r.monthlyRevenue, 0),
    color: `hsl(${(i * 60) % 360}, 70%, 60%)`,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total MRR"
          value={formatINR(metrics?.totalMRR || 0)}
          subtitle="Monthly Recurring Revenue"
          trend={{ value: metrics?.momGrowth || 0, label: "vs last month" }}
          icon={DollarSign}
          highlight
        />
        <StatCard
          title="Revenue This Month"
          value={formatINR(metrics?.revenueThisMonth || 0)}
          subtitle={`Last month: ${formatINR(metrics?.revenueLastMonth || 0)}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Schools"
          value={String(metrics?.activeSchools || 0)}
          subtitle={`of ${metrics?.totalSchools || 0} total`}
          icon={Building2}
        />
        <StatCard
          title="Total Students"
          value={metrics?.totalStudents?.toLocaleString("en-IN") || "0"}
          subtitle="Across all schools"
          icon={Users}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MRR Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Recurring Revenue Trend</CardTitle>
            <CardDescription>MRR growth over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={mrrTrendData} height={200} />
          </CardContent>
        </Card>

        {/* Revenue vs Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Cost Breakdown</CardTitle>
            <CardDescription>Monthly revenue and operational costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(217,91%,60%)]" />
                <span className="text-sm text-text-secondary">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(160,84%,39%)]" />
                <span className="text-sm text-text-secondary">Cost</span>
              </div>
            </div>
            <LineChart data={revenueVsCostData} height={200} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Pricing Tier</CardTitle>
            <CardDescription>Distribution across economy, standard, and premium</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart data={tierData} size={160} />
          </CardContent>
        </Card>

        {/* Revenue by Region */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Region</CardTitle>
            <CardDescription>Geographic distribution of revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={regionData.slice(0, 6).map((d, i) => ({
                label: d.label,
                value: d.value,
                color: d.color,
              }))}
              height={180}
            />
          </CardContent>
        </Card>

        {/* Revenue Forecasting */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Forecasting</CardTitle>
            <CardDescription>Projected MRR for next 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const baseMRR = metrics?.totalMRR || 0;
                const growthRate = 1 + (metrics?.momGrowth || 5) / 100;
                const projected = baseMRR * Math.pow(growthRate, i + 1);
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Month {i + 1}</span>
                    <span className="text-sm font-medium text-text-primary">{formatINR(projected)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trial vs Paid Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Trial vs Paid Revenue</CardTitle>
            <CardDescription>Revenue from trial and paying schools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">
                  {revenues.filter((r) => r.billingStatus === "paid").length}
                </p>
                <p className="text-sm text-text-secondary mt-1">Paying Schools</p>
                <p className="text-lg font-semibold text-success mt-2">
                  {formatINR(revenues.filter((r) => r.billingStatus === "paid").reduce((sum, r) => sum + r.monthlyRevenue, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">
                  {revenues.filter((r) => r.billingStatus !== "paid").length}
                </p>
                <p className="text-sm text-text-secondary mt-1">Trial Schools</p>
                <p className="text-lg font-semibold text-warning mt-2">
                  {formatINR(revenues.filter((r) => r.billingStatus !== "paid").reduce((sum, r) => sum + r.monthlyRevenue, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Count vs Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Student Count vs Revenue</CardTitle>
            <CardDescription>Correlation between student enrollment and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={revenues.slice(0, 8).map((r) => ({
                label: r.schoolName.slice(0, 8),
                value: r.studentCount,
              }))}
              height={180}
            />
          </CardContent>
        </Card>
      </div>

      {/* School Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>School Revenue Breakdown</CardTitle>
          <CardDescription>Detailed revenue information for each school</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Price/Student</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>AI Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.slice(0, 10).map((school) => (
                <TableRow key={school.schoolId}>
                  <TableCell className="font-medium">{school.schoolName}</TableCell>
                  <TableCell>{school.studentCount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>{formatINRDecimal(school.pricePerStudent)}</TableCell>
                  <TableCell className="text-success font-medium">{formatINRDecimal(school.monthlyRevenue)}</TableCell>
                  <TableCell className="text-warning">{formatINRDecimal(school.aiCost)}</TableCell>
                  <TableCell className={school.profit >= 0 ? "text-success" : "text-danger"}>
                    {formatINRDecimal(school.profit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={school.profitMargin >= 30 ? "success" : school.profitMargin >= 0 ? "warning" : "danger"}>
                      {school.profitMargin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={school.billingStatus === "paid" ? "success" : school.billingStatus === "overdue" ? "danger" : "warning"}
                    >
                      {school.billingStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {revenues.length > 10 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                View All {revenues.length} Schools
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
