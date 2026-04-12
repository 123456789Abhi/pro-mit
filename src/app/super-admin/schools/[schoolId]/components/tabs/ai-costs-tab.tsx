"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Zap,
  Database,
  BarChart3,
  Edit3,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AICostsTabProps {
  aiCosts: {
    monthlyBudget: number;
    budgetUsed: number;
    alertThreshold: number;
    isCapped: boolean;
    resetDay: number;
    costTrend: Array<{ month: string; cost: number }>;
    usageStats: {
      totalQueries: number;
      cacheHitRate: number;
      modelBreakdown: Record<string, number>;
      topCostContributors: Array<{ feature: string; cost: number; percentage: number }>;
    };
    dailyUsage: Array<{ date: string; activeStudents: number; avgQueriesPerStudent: number }>;
    costPerStudent: number;
    costPerQuery: number;
  };
}

export function AICostsTab({ aiCosts }: AICostsTabProps) {
  const [showEditBudgetDialog, setShowEditBudgetDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    monthlyBudget: aiCosts.monthlyBudget,
    alertThreshold: aiCosts.alertThreshold,
    isCapped: aiCosts.isCapped,
  });

  const budgetPercentage = (aiCosts.budgetUsed / aiCosts.monthlyBudget) * 100;
  const isWarning = budgetPercentage >= aiCosts.alertThreshold;
  const isDanger = budgetPercentage >= 100;

  const maxTrendCost = Math.max(...aiCosts.costTrend.map((c) => c.cost));

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand/10 p-2">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Monthly Budget</p>
                <p className="text-xl font-semibold text-text-primary">
                  ₹{aiCosts.monthlyBudget.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info-bg p-2">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Budget Used</p>
                <p className="text-xl font-semibold text-text-primary">
                  ₹{aiCosts.budgetUsed.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-bg p-2">
                <Zap className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Queries</p>
                <p className="text-xl font-semibold text-text-primary">
                  {aiCosts.usageStats.totalQueries.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-surface-2 p-2">
                <Database className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Cache Hit Rate</p>
                <p className="text-xl font-semibold text-text-primary">
                  {aiCosts.usageStats.cacheHitRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress Bar */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-text-primary">
              Budget Usage - April 2026
            </CardTitle>
            <Dialog open={showEditBudgetDialog} onOpenChange={setShowEditBudgetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Budget
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit AI Budget</DialogTitle>
                  <DialogDescription>
                    Configure monthly budget limits and alert thresholds for this school.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      Monthly Budget (₹)
                    </label>
                    <Input
                      type="number"
                      value={editForm.monthlyBudget}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          monthlyBudget: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      Alert Threshold (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.alertThreshold}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          alertThreshold: parseInt(e.target.value) || 80,
                        }))
                      }
                    />
                    <p className="text-xs text-text-muted">
                      Get notified when usage reaches this percentage of budget
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-text-primary">
                        Budget Cap
                      </label>
                      <p className="text-xs text-text-muted">
                        Stop AI usage when budget is exhausted
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editForm.isCapped}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          isCapped: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditBudgetDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      // Save budget settings
                      setShowEditBudgetDialog(false);
                    }}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                ₹{aiCosts.budgetUsed.toLocaleString("en-IN")} of ₹
                {aiCosts.monthlyBudget.toLocaleString("en-IN")}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isDanger
                    ? "text-danger"
                    : isWarning
                    ? "text-warning"
                    : "text-text-primary"
                )}
              >
                {budgetPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="relative">
              <Progress
                value={Math.min(budgetPercentage, 100)}
                className={cn(
                  "h-3",
                  isDanger
                    ? "[&>div]:bg-danger"
                    : isWarning
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-brand"
                )}
              />
              {/* Threshold markers */}
              <div
                className="absolute top-0 h-full w-px bg-text-muted"
                style={{ left: `${aiCosts.alertThreshold}%` }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-text-muted whitespace-nowrap">
                  {aiCosts.alertThreshold}%
                </span>
              </div>
            </div>
          </div>

          {/* Threshold indicators */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-text-muted">Warning ({aiCosts.alertThreshold}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-danger" />
              <span className="text-text-muted">Cap (100%)</span>
            </div>
            {aiCosts.isCapped && (
              <Badge variant="outline" className="bg-danger-bg text-danger border-danger">
                Budget Capped
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Trend Chart */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cost Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-2">
            {aiCosts.costTrend.map((item) => {
              const height = (item.cost / maxTrendCost) * 100;
              return (
                <div key={item.month} className="flex flex-col items-center flex-1 gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-36">
                    <div
                      className="w-full rounded-t bg-brand hover:bg-brand/80 transition-colors cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`₹${item.cost.toLocaleString("en-IN")}`}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{item.month}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted text-center mt-4">
            Max: ₹{maxTrendCost.toLocaleString("en-IN")}
          </p>
        </CardContent>
      </Card>

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Breakdown */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary">
              Model Usage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(aiCosts.usageStats.modelBreakdown).map(([model, queries]) => {
              const percentage = (queries / aiCosts.usageStats.totalQueries) * 100;
              return (
                <div key={model} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-primary font-medium">
                      {model.replace("-", " ").toUpperCase()}
                    </span>
                    <span className="text-text-secondary">
                      {queries.toLocaleString("en-IN")} queries ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Cost Contributors */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary">
              Top Cost Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiCosts.usageStats.topCostContributors.map((item) => (
              <div key={item.feature} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-primary">{item.feature}</span>
                    <span className="text-text-secondary">
                      ₹{item.cost.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-text-muted w-12 text-right">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage & Cost Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Usage */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary">
              Daily Usage (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiCosts.dailyUsage.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2"
                >
                  <span className="text-sm text-text-primary">{day.date}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-secondary">
                      {day.activeStudents} students
                    </span>
                    <span className="text-text-muted">
                      {day.avgQueriesPerStudent} avg queries
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Metrics */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary">
              Cost Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2/50 p-4">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                  <IndianRupee className="h-3 w-3" />
                  Cost per Student (Monthly)
                </div>
                <p className="text-2xl font-semibold text-text-primary">
                  ₹{aiCosts.costPerStudent.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-4">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                  <Zap className="h-3 w-3" />
                  Cost per Query (Average)
                </div>
                <p className="text-2xl font-semibold text-text-primary">
                  ₹{aiCosts.costPerQuery.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
