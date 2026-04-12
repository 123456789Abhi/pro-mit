"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import {
  getPlatformPricing,
  updatePlatformPricing,
  PlatformPricing,
} from "@/lib/actions/super-admin/financials";
import { formatINR, formatINRDecimal } from "@/lib/utils";
import { toast } from "sonner";
import { Settings, Save, RefreshCw, TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────
// Main Pricing Tab
// ─────────────────────────────────────────────

export function PricingTab() {
  const [pricing, setPricing] = useState<PlatformPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [defaultPrice, setDefaultPrice] = useState("");
  const [infraCost, setInfraCost] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const result = await getPlatformPricing();
      if (result.success) {
        setPricing(result.data);
        setDefaultPrice(result.data.defaultPricePerStudent.toString());
        setInfraCost(result.data.infraCostPerSchool.toString());
        setBillingCycle(result.data.billingCycle);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    const price = parseFloat(defaultPrice);
    const infra = parseFloat(infraCost);

    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid default price");
      return;
    }

    if (isNaN(infra) || infra < 0) {
      toast.error("Please enter a valid infrastructure cost");
      return;
    }

    setSaving(true);
    try {
      const result = await updatePlatformPricing({
        defaultPricePerStudent: price,
        infraCostPerSchool: infra,
        billingCycle,
      });

      if (result.success) {
        toast.success("Pricing updated successfully");
        setHasChanges(false);
        loadData();
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (pricing) {
      setDefaultPrice(pricing.defaultPricePerStudent.toString());
      setInfraCost(pricing.infraCostPerSchool.toString());
      setBillingCycle(pricing.billingCycle);
      setHasChanges(false);
    }
  };

  const handlePriceChange = (field: "default" | "infra", value: string) => {
    if (field === "default") {
      setDefaultPrice(value);
    } else {
      setInfraCost(value);
    }
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-32 animate-skeleton rounded bg-surface-2" />
            </Card>
          ))}
        </div>
        <Card>
          <div className="h-64 animate-skeleton rounded bg-surface-2" />
        </Card>
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

  if (!pricing) {return null;}

  return (
    <div className="space-y-6">
      {/* Current Settings Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Default Price</CardTitle>
            <CardDescription>Starting price for new schools</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text-primary">
              {formatINR(pricing.defaultPricePerStudent)}
            </p>
            <p className="text-sm text-text-muted mt-1">per student per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Cost</CardTitle>
            <CardDescription>Fixed cost per school per month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text-primary">
              {formatINR(pricing.infraCostPerSchool)}
            </p>
            <p className="text-sm text-text-muted mt-1">per school per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Cycle</CardTitle>
            <CardDescription>How often schools are billed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text-primary capitalize">
              {pricing.billingCycle}
            </p>
            <p className="text-sm text-text-muted mt-1">billing frequency</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Tiers Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            <CardTitle>Pricing Tiers</CardTitle>
          </div>
          <CardDescription>Current distribution of schools across pricing tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricing.tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-lg p-4 border ${
                  tier.name === "Economy"
                    ? "border-success/30 bg-success-bg/20"
                    : tier.name === "Standard"
                    ? "border-info/30 bg-info-bg/20"
                    : "border-purple-500/30 bg-purple-500/10"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-text-primary">{tier.name}</h4>
                  <Badge
                    variant={
                      tier.name === "Economy"
                        ? "success"
                        : tier.name === "Standard"
                        ? "info"
                        : "outline"
                    }
                  >
                    {tier.schoolCount} schools
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Price Range</span>
                    <span className="text-text-primary font-medium">
                      {tier.maxPrice === Infinity
                        ? `>${formatINR(tier.minPrice)}`
                        : `${formatINR(tier.minPrice)} - ${formatINR(tier.maxPrice)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Monthly Revenue</span>
                    <span className="text-success font-medium">{formatINR(tier.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Pricing Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand" />
              <CardTitle>Platform Pricing Settings</CardTitle>
            </div>
            {hasChanges && (
              <Badge variant="warning">Unsaved Changes</Badge>
            )}
          </div>
          <CardDescription>
            Configure default pricing for new schools. Custom pricing can be set per school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Default Price Per Student */}
            <div className="space-y-2">
              <Label htmlFor="defaultPrice">Default Price Per Student</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₹</span>
                <Input
                  id="defaultPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultPrice}
                  onChange={(e) => handlePriceChange("default", e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-text-muted">Starting price for new schools</p>
            </div>

            {/* Infrastructure Cost */}
            <div className="space-y-2">
              <Label htmlFor="infraCost">Infrastructure Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₹</span>
                <Input
                  id="infraCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={infraCost}
                  onChange={(e) => handlePriceChange("infra", e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-text-muted">Fixed cost per school/month</p>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select
                value={billingCycle}
                onChange={(e) => {
                  setBillingCycle(e.target.value as "monthly" | "annual");
                  setHasChanges(true);
                }}
              >
                <SelectOption value="monthly">Monthly</SelectOption>
                <SelectOption value="annual">Annual</SelectOption>
              </Select>
              <p className="text-xs text-text-muted">How often to bill schools</p>
            </div>

            {/* Minimum Students */}
            <div className="space-y-2">
              <Label htmlFor="minStudents">Minimum Students</Label>
              <Input
                id="minStudents"
                type="number"
                value={pricing.minStudents}
                disabled
              />
              <p className="text-xs text-text-muted">Minimum billable students</p>
            </div>
          </div>

          {/* Cost Structure Explanation */}
          <div className="mt-8 p-4 bg-surface-2 rounded-lg">
            <h4 className="font-medium text-text-primary mb-3">Cost Structure</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-success-bg rounded-lg">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Revenue</p>
                  <p className="text-xs text-text-secondary">
                    {formatINRDecimal(parseFloat(defaultPrice || "0"))} x Student Count x Billing Months
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-warning-bg rounded-lg">
                  <svg className="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">AI Cost (Internal)</p>
                  <p className="text-xs text-text-secondary">
                    Varies by usage, tracked separately
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-info-bg rounded-lg">
                  <svg className="h-4 w-4 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Infra Share</p>
                  <p className="text-xs text-text-secondary">
                    {formatINR(parseFloat(infraCost || "0"))} per school per month
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Profit Formula:</span>
                <span className="text-sm font-mono text-text-primary">
                  Profit = Revenue - AI Cost - Infra Share
                </span>
              </div>
            </div>
          </div>

          {/* Profit Calculation Preview */}
          <div className="mt-6 p-4 border border-border rounded-lg">
            <h4 className="font-medium text-text-primary mb-3">Profit Calculation Preview</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Revenue (30 students)</span>
                <span className="text-success font-medium">
                  {formatINR(parseFloat(defaultPrice || "0") * 30)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Est. AI Cost</span>
                <span className="text-warning font-medium">- {formatINR(1000)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Infra Cost</span>
                <span className="text-warning font-medium">- {formatINR(parseFloat(infraCost || "0"))}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-text-primary font-medium">Est. Profit</span>
                <span className="text-success font-bold">
                  {formatINR(
                    parseFloat(defaultPrice || "0") * 30 -
                      1000 -
                      parseFloat(infraCost || "0")
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            )}
            <Button onClick={handleSave} loading={saving} disabled={!hasChanges} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tier Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Definitions</CardTitle>
          <CardDescription>
            Pricing tiers are for reporting purposes. Schools can have any custom price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-success-bg/20 rounded-lg border border-success/30">
              <div className="p-2 bg-success rounded-lg">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Economy Tier</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Schools with price per student &lt; {formatINR(50)}/month.
                  Typically smaller schools or those in pilot phase.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-info-bg/20 rounded-lg border border-info/30">
              <div className="p-2 bg-info rounded-lg">
                <span className="text-lg font-bold text-white">S</span>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Standard Tier</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Schools with price per student between {formatINR(50)} - {formatINR(150)}/month.
                  The majority of schools fall in this tier.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="p-2 bg-purple-500 rounded-lg">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Premium Tier</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Schools with price per student &gt; {formatINR(150)}/month.
                  Premium schools may receive additional features or support.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
