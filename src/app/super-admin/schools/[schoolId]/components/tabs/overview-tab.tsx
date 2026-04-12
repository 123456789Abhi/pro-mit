"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  IndianRupee,
  Activity,
  Edit3,
  UserCog,
  ToggleLeft,
  Download,
} from "lucide-react";
import type { School } from "../../../types";
import { SCHOOL_STATUS_CONFIG } from "../../../types";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  school: School;
  daysRemaining: number;
}

export function OverviewTab({ school, daysRemaining }: OverviewTabProps) {
  const statusConfig = SCHOOL_STATUS_CONFIG[school.status];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Edit3 className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCog className="h-4 w-4" />
          Impersonate
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <ToggleLeft className="h-4 w-4" />
          Change Status
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand/10 p-2">
                <Users className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Students</p>
                <p className="text-xl font-semibold text-text-primary">
                  {school.student_count.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info-bg p-2">
                <GraduationCap className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Teachers</p>
                <p className="text-xl font-semibold text-text-primary">
                  {school.teacher_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-bg p-2">
                <IndianRupee className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Monthly Revenue</p>
                <p className="text-xl font-semibold text-text-primary">
                  ₹{school.monthly_revenue.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg p-2",
                daysRemaining < 30 ? "bg-warning-bg" : "bg-surface-2"
              )}>
                <Clock className={cn(
                  "h-5 w-5",
                  daysRemaining < 30 ? "text-warning" : "text-text-secondary"
                )} />
              </div>
              <div>
                <p className="text-xs text-text-muted">Days Remaining</p>
                <p className={cn(
                  "text-xl font-semibold",
                  daysRemaining < 30 ? "text-warning" : "text-text-primary"
                )}>
                  {daysRemaining}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* School Info Card */}
        <Card className="border-border bg-surface-1 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Board</p>
                <p className="text-sm text-text-primary">{school.board}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Academic Year</p>
                <p className="text-sm text-text-primary">{school.academic_year}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-muted">City</p>
                <p className="text-sm text-text-primary">{school.city || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Region</p>
                <p className="text-sm text-text-primary">{school.region || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-muted">AI Assistant</p>
                <p className="text-sm text-text-primary">{school.ai_assistant_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Status</p>
                <Badge className={cn(statusConfig.bgColor, statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Principal Card */}
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <User className="h-5 w-5" />
              Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {school.principal_name || "—"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="h-4 w-4 text-text-muted" />
                {school.principal_email || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone className="h-4 w-4 text-text-muted" />
                {school.principal_phone || "—"}
              </div>
            </div>
            {school.last_active_at && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Activity className="h-3 w-3" />
                  Last active:{" "}
                  {new Date(school.last_active_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Info */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Start Date</p>
              <p className="text-sm text-text-primary">
                {new Date(school.subscription_start_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Expiry Date</p>
              <p className="text-sm text-text-primary">
                {new Date(school.subscription_expiry_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Duration</p>
              <p className="text-sm text-text-primary">{daysRemaining} days remaining</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Price per Student/Month</p>
              <p className="text-sm text-text-primary">
                ₹{school.price_per_student_monthly.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
