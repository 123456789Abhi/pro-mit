"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Send,
  CheckCircle2,
  Eye,
  Star,
  Clock,
  BarChart3,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationsTabProps {
  notifications: {
    summary: {
      totalSent: number;
      delivered: number;
      read: number;
      avgRating: number;
    };
    recentNotifications: Array<{
      id: string;
      title: string;
      sentAt: string;
      sentBy: string;
      recipients: string;
      status: string;
      readCount: number;
      totalCount: number;
      rating: number;
    }>;
    templatesUsed: Array<{ name: string; count: number }>;
    feedbackReceived: number;
    rateLimit: {
      daily: number;
      usedToday: number;
      resetsAt: string;
    };
  };
}

const STATUS_CONFIG = {
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success-bg",
  },
  read: {
    label: "Read",
    icon: Eye,
    color: "text-info",
    bgColor: "bg-info-bg",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning-bg",
  },
};

export function NotificationsTab({ notifications }: NotificationsTabProps) {
  const [activeView, setActiveView] = useState<"recent" | "templates">("recent");

  const deliveryRate = (notifications.summary.delivered / notifications.summary.totalSent) * 100;
  const readRate = (notifications.summary.read / notifications.summary.delivered) * 100;
  const rateLimitUsage = (notifications.rateLimit.usedToday / notifications.rateLimit.daily) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand/10 p-2">
                <Send className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Sent</p>
                <p className="text-xl font-semibold text-text-primary">
                  {notifications.summary.totalSent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-bg p-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Delivered</p>
                <p className="text-xl font-semibold text-text-primary">
                  {notifications.summary.delivered}
                </p>
                <p className="text-xs text-text-muted">{deliveryRate.toFixed(1)}% delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info-bg p-2">
                <Eye className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Read</p>
                <p className="text-xl font-semibold text-text-primary">
                  {notifications.summary.read}
                </p>
                <p className="text-xs text-text-muted">{readRate.toFixed(1)}% read rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning-bg p-2">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Avg Rating</p>
                <p className="text-xl font-semibold text-text-primary">
                  {notifications.summary.avgRating}
                </p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        star <= Math.round(notifications.summary.avgRating)
                          ? "fill-warning text-warning"
                          : "text-surface-2"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limit Status */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rate Limit Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              Principal daily notifications ({notifications.rateLimit.usedToday} of {notifications.rateLimit.daily} used)
            </span>
            <span className="text-sm text-text-primary font-medium">
              {notifications.rateLimit.usedToday}/{notifications.rateLimit.daily}
            </span>
          </div>
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                rateLimitUsage > 90
                  ? "bg-danger"
                  : rateLimitUsage > 70
                  ? "bg-warning"
                  : "bg-brand"
              )}
              style={{ width: `${rateLimitUsage}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            Resets at {new Date(notifications.rateLimit.resetsAt).toLocaleString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })} IST
          </p>
        </CardContent>
      </Card>

      {/* Recent Notifications & Templates */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Notifications */}
        <Card className="border-border bg-surface-1 lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeView === "recent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveView("recent")}
                >
                  Recent
                </Button>
                <Button
                  variant={activeView === "templates" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveView("templates")}
                >
                  Templates
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeView === "recent" ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-surface-2/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.recentNotifications.map((notification) => {
                    const statusConfig =
                      STATUS_CONFIG[notification.status as keyof typeof STATUS_CONFIG] ||
                      STATUS_CONFIG.delivered;
                    const StatusIcon = statusConfig.icon;
                    const readPercentage = (notification.readCount / notification.totalCount) * 100;

                    return (
                      <TableRow key={notification.id} className="border-border">
                        <TableCell>
                          <div>
                            <p className="font-medium text-text-primary">{notification.title}</p>
                            <p className="text-xs text-text-muted">
                              {new Date(notification.sentAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {notification.sentBy.split(" ")[0]}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {notification.recipients}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm text-text-primary">
                              {notification.readCount}/{notification.totalCount}
                            </span>
                            <div className="w-12 h-1 rounded-full bg-surface-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{ width: `${readPercentage}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="ml-1 text-sm text-text-primary">
                              {notification.rating}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(statusConfig.bgColor, statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 space-y-3">
                {notifications.templatesUsed.map((template) => (
                  <div
                    key={template.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-text-muted" />
                      <span className="text-sm text-text-primary">{template.name}</span>
                    </div>
                    <Badge variant="outline" className="bg-surface-1 border-border text-text-secondary">
                      {template.count}x used
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Stats */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Feedback Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">Feedback Received</span>
                <span className="text-2xl font-semibold text-text-primary">
                  {notifications.feedbackReceived}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Total feedback submissions on notifications
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-text-secondary font-medium">Engagement Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand to-success" style={{ width: "72%" }} />
                </div>
                <span className="text-sm font-medium text-text-primary">72%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-text-muted mb-3">Recent Tags</p>
              <div className="flex flex-wrap gap-2">
                {["Helpful", "Timely", "Clear", "Informative", "Actionable"].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-surface-2 border-border text-text-secondary text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
