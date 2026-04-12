import { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueOverviewTab } from "./tabs/revenue-overview";
import { SchoolBillingTab } from "./tabs/school-billing";
import { AICostMonitorTab } from "./tabs/ai-cost-monitor";
import { PricingTab } from "./tabs/pricing";

export const metadata: Metadata = {
  title: "Financials",
  description: "Revenue, billing, AI costs, and pricing management",
};

export default async function FinancialsPage() {
  // Verify user is super_admin
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-text-secondary">Please log in to access this page.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary">This page is only accessible to Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Financials</h1>
        <p className="text-text-secondary mt-1">
          Revenue overview, school billing, AI cost monitoring, and pricing management.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="revenue">Revenue Overview</TabsTrigger>
          <TabsTrigger value="billing">School Billing</TabsTrigger>
          <TabsTrigger value="ai-costs">AI Cost Monitor</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueOverviewTab />
        </TabsContent>

        <TabsContent value="billing">
          <SchoolBillingTab />
        </TabsContent>

        <TabsContent value="ai-costs">
          <AICostMonitorTab />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
