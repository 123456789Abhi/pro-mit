"use client";

import * as React from "react";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { School } from "../../types";
import { OverviewTab } from "./tabs/overview-tab";
import { TeamTab } from "./tabs/team-tab";
import { AICostsTab } from "./tabs/ai-costs-tab";
import { ContentTab } from "./tabs/content-tab";
import { NotificationsTab } from "./tabs/notifications-tab";
import { SettingsTab } from "./tabs/settings-tab";

interface SchoolDetailTabsProps {
  school: School;
  team: {
    principal: {
      id: string;
      name: string;
      email: string;
      phone: string;
      last_login: string;
      employee_id: string;
    };
    teachers: Array<{
      id: string;
      name: string;
      email: string;
      department: string;
      subjects: string[];
      assigned_classes: string[];
      status: string;
      ai_adoption: number;
      platform_usage: string;
      last_login: string;
    }>;
    studentsByClass: Array<{ class: string; count: number }>;
  };
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
  content: {
    enabledBooks: Array<{
      id: string;
      title: string;
      publisher: string;
      status: string;
    }>;
    preGenSettings: {
      notes: boolean;
      summaries: boolean;
      faq: boolean;
      drills: boolean;
    };
    processingQueue: Array<{
      bookId: string;
      title: string;
      status: string;
      progress: number;
    }>;
  };
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
  daysRemaining: number;
}

export function SchoolDetailTabs({
  school,
  team,
  aiCosts,
  content,
  notifications,
  daysRemaining,
}: SchoolDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6 gap-2 bg-transparent p-0 h-auto">
        <TabsTrigger
          value="overview"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="team"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          Team
        </TabsTrigger>
        <TabsTrigger
          value="ai-costs"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          AI & Costs
        </TabsTrigger>
        <TabsTrigger
          value="content"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          Content
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          Notifications
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className={cn(
            "data-[state=active]:bg-brand data-[state=active]:text-white",
            "data-[state=active]:shadow-sm rounded-lg px-3 py-2 text-sm font-medium",
            "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
            "transition-all"
          )}
        >
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab school={school} daysRemaining={daysRemaining} />
      </TabsContent>

      <TabsContent value="team" className="mt-6">
        <TeamTab team={team} />
      </TabsContent>

      <TabsContent value="ai-costs" className="mt-6">
        <AICostsTab aiCosts={aiCosts} />
      </TabsContent>

      <TabsContent value="content" className="mt-6">
        <ContentTab content={content} />
      </TabsContent>

      <TabsContent value="notifications" className="mt-6">
        <NotificationsTab notifications={notifications} />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <SettingsTab school={school} />
      </TabsContent>
    </Tabs>
  );
}
