"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Building2,
  Calendar,
  IndianRupee,
  Zap,
  Palette,
  KeyRound,
  Monitor,
  AlertTriangle,
  ShieldAlert,
  Save,
} from "lucide-react";
import type { School } from "../../../types";

interface SettingsTabProps {
  school: School;
}

export function SettingsTab({ school }: SettingsTabProps) {
  // School Info State
  const [schoolInfo, setSchoolInfo] = useState({
    name: school.name,
    city: school.city || "",
    region: school.region || "",
  });

  // Subscription State
  const [subscription, setSubscription] = useState({
    startDate: school.subscription_start_date,
    expiryDate: school.subscription_expiry_date,
    plan: "paid" as "trial" | "paid",
  });

  // Pricing State
  const [pricing, setPricing] = useState({
    pricePerStudent: school.price_per_student_monthly,
    minBilling: school.min_billing_students,
  });

  // AI Budget State
  const [aiBudget, setAIBudget] = useState({
    monthlyBudget: school.ai_budget,
    alertThreshold: school.ai_alert_threshold,
    isCapped: school.ai_is_capped,
  });

  // Branding State
  const [branding, setBranding] = useState({
    giniName: school.ai_assistant_name,
    primaryColor: school.primary_color || "#3b82f6",
  });

  // Dialog states
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

  return (
    <div className="space-y-6">
      {/* Edit School Info */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Information
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary">
            Update basic school details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                value={schoolInfo.name}
                onChange={(e) => setSchoolInfo((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={schoolInfo.city}
                onChange={(e) => setSchoolInfo((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={schoolInfo.region}
                onChange={(e) => setSchoolInfo((prev) => ({ ...prev, region: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Subscription */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary">
            Manage subscription plan and expiry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subStart">Start Date</Label>
              <Input
                id="subStart"
                type="date"
                value={subscription.startDate}
                onChange={(e) => setSubscription((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subExpiry">Expiry Date</Label>
              <Input
                id="subExpiry"
                type="date"
                value={subscription.expiryDate}
                onChange={(e) => setSubscription((prev) => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                value={subscription.plan}
                onChange={(e) => setSubscription((prev) => ({ ...prev, plan: e.target.value as "trial" | "paid" }))}
                className="w-full h-10 rounded-lg border border-border bg-surface-1 px-3 text-sm text-text-primary"
              >
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              Extend Subscription
            </Button>
            <Button variant="outline" className="gap-2">
              Convert to Paid
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Pricing */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Pricing
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary">
            Configure per-student pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricePerStudent">Price per Student/Month (₹)</Label>
              <Input
                id="pricePerStudent"
                type="number"
                value={pricing.pricePerStudent}
                onChange={(e) => setPricing((prev) => ({ ...prev, pricePerStudent: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minBilling">Minimum Billing Students</Label>
              <Input
                id="minBilling"
                type="number"
                value={pricing.minBilling}
                onChange={(e) => setPricing((prev) => ({ ...prev, minBilling: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Update Pricing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit AI Budget */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Budget
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary">
            Configure monthly limits and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Monthly Budget (₹)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                value={aiBudget.monthlyBudget}
                onChange={(e) => setAIBudget((prev) => ({ ...prev, monthlyBudget: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                min={0}
                max={100}
                value={aiBudget.alertThreshold}
                onChange={(e) => setAIBudget((prev) => ({ ...prev, alertThreshold: parseInt(e.target.value) || 80 }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4">
              <div>
                <Label htmlFor="budgetCap" className="text-sm font-medium text-text-primary">
                  Budget Cap
                </Label>
                <p className="text-xs text-text-muted">Stop AI when exhausted</p>
              </div>
              <Switch
                id="budgetCap"
                checked={aiBudget.isCapped}
                onCheckedChange={(checked) => setAIBudget((prev) => ({ ...prev, isCapped: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Update Budget
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Branding */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription className="text-sm text-text-secondary">
            Customize the AI assistant appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="giniName">GiNi Name</Label>
              <Input
                id="giniName"
                value={branding.giniName}
                onChange={(e) => setBranding((prev) => ({ ...prev, giniName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Update Branding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Reset Principal Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Reset Principal Password</DialogTitle>
                  <DialogDescription>
                    This will send a password reset link to {school.principal_email}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowResetPasswordDialog(false)}>
                    Send Reset Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="gap-2">
              <Monitor className="h-4 w-4" />
              View Active Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/20 bg-danger-bg/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-danger flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {school.status === "suspended" ? (
              <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-success text-success hover:bg-success-bg">
                    Reactivate School
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Reactivate School</DialogTitle>
                    <DialogDescription>
                      This will restore access for {school.name}. Are you sure?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReactivateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowReactivateDialog(false)}>
                      Reactivate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-danger text-danger hover:bg-danger-bg">
                    Deactivate School
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Deactivate School</DialogTitle>
                    <DialogDescription>
                      This will immediately revoke access for all users at {school.name}. This action can be reversed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="deactivateReason">Reason (optional)</Label>
                      <textarea
                        id="deactivateReason"
                        value={deactivateReason}
                        onChange={(e) => setDeactivateReason(e.target.value)}
                        placeholder="Reason for deactivation..."
                        className="w-full h-24 rounded-lg border border-border bg-surface-1 p-3 text-sm text-text-primary resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeactivateDialog(false)}
                    >
                      Deactivate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-warning text-warning hover:bg-warning-bg">
                  Transfer Ownership
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Transfer Ownership</DialogTitle>
                  <DialogDescription>
                    Transfer ownership of {school.name} to another Super Admin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="transferEmail">New Owner Email</Label>
                    <Input
                      id="transferEmail"
                      type="email"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowTransferDialog(false)} disabled={!transferEmail}>
                    Transfer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
