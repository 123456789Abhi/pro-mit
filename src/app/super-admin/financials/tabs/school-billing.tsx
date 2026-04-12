"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  getSchoolRevenues,
  getRenewalPipeline,
  updateSchoolPrice,
  sendInvoiceToSchool,
  markInvoicePaid,
  freezeSchoolBilling,
  unfreezeSchoolBilling,
  SchoolRevenue,
  RenewalItem,
} from "@/lib/actions/super-admin/financials";
import { formatINR, formatINRDecimal } from "@/lib/utils";
import { toast } from "sonner";
import {
  Send,
  Edit3,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Download,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
// Edit Price Dialog
// ─────────────────────────────────────────────

function EditPriceDialog({
  open,
  onOpenChange,
  school,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolRevenue | null;
  onSave: (schoolId: string, price: number) => Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setPrice(school.pricePerStudent.toString());
    }
  }, [school]);

  const handleSave = async () => {
    if (!school) {return;}
    const newPrice = parseFloat(price);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSaving(true);
    try {
      await onSave(school.schoolId, newPrice);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Price Per Student</DialogTitle>
          <DialogDescription>
            Update the monthly price per student for {school?.schoolName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price Per Student (INR/month)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₹</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-text-muted">
              Current price: {formatINRDecimal(school?.pricePerStudent || 0)}
            </p>
          </div>

          <div className="bg-surface-2 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-text-primary">Pricing Tiers</p>
            <div className="flex gap-4 text-xs">
              <span className="text-text-secondary">
                <span className="text-success">Economy:</span> &lt;₹50
              </span>
              <span className="text-text-secondary">
                <span className="text-info">Standard:</span> ₹50-150
              </span>
              <span className="text-text-secondary">
                <span className="text-purple-500">Premium:</span> &gt;₹150
              </span>
            </div>
          </div>

          {school && (
            <div className="bg-surface-2 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-text-primary">Revenue Impact</p>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Student Count</span>
                <span className="text-text-primary">{school.studentCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Current Monthly Revenue</span>
                <span className="text-text-primary">{formatINRDecimal(school.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">New Monthly Revenue</span>
                <span className="text-success font-medium">
                  {formatINRDecimal(parseFloat(price || "0") * school.studentCount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Send Invoice Dialog
// ─────────────────────────────────────────────

function SendInvoiceDialog({
  open,
  onOpenChange,
  school,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolRevenue | null;
  onSend: (schoolId: string, period: string) => Promise<void>;
}) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sending, setSending] = useState(false);

  const billingPeriod = (() => {
    const [year, month] = period.split("-");
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  })();

  const handleSend = async () => {
    if (!school) {return;}
    setSending(true);
    try {
      await onSend(school.schoolId, billingPeriod);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Invoice to School</DialogTitle>
          <DialogDescription>
            Send an invoice notification to the principal of {school?.schoolName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="period">Billing Period</Label>
            <Input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>

          {school && (
            <div className="bg-surface-2 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-text-primary">Invoice Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">School</span>
                <span className="text-text-primary">{school.schoolName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Billing Period</span>
                <span className="text-text-primary">{billingPeriod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Student Count</span>
                <span className="text-text-primary">{school.studentCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Price/Student</span>
                <span className="text-text-primary">{formatINRDecimal(school.pricePerStudent)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-border pt-2 mt-2">
                <span className="text-text-primary">Total Amount</span>
                <span className="text-success">{formatINRDecimal(school.monthlyRevenue)}</span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Note: AI costs are internal only and not shown to the school.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} loading={sending} className="gap-2">
            <Send className="h-4 w-4" />
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Main School Billing Tab
// ─────────────────────────────────────────────

export function SchoolBillingTab() {
  const [revenues, setRevenues] = useState<SchoolRevenue[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolRevenue | null>(null);
  const [sendingToSchool, setSendingToSchool] = useState<SchoolRevenue | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "overdue">("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [revenuesResult, renewalsResult] = await Promise.all([
        getSchoolRevenues(),
        getRenewalPipeline(),
      ]);

      if (revenuesResult.success) {setRevenues(revenuesResult.data);}
      if (renewalsResult.success) {setRenewals(renewalsResult.data);}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleSavePrice = async (schoolId: string, price: number) => {
    const result = await updateSchoolPrice(schoolId, price);
    if (result.success) {
      toast.success("Price updated successfully");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleSendInvoice = async (schoolId: string, period: string) => {
    const result = await sendInvoiceToSchool(schoolId, period);
    if (result.success) {
      toast.success(`Invoice sent to school (${result.data.recipientCount} recipient(s))`);
    } else {
      toast.error(result.error);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    const result = await markInvoicePaid(invoiceId);
    if (result.success) {
      toast.success("Invoice marked as paid");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleFreeze = async (schoolId: string) => {
    const result = await freezeSchoolBilling(schoolId);
    if (result.success) {
      toast.success("School billing frozen");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleUnfreeze = async (schoolId: string) => {
    const result = await unfreezeSchoolBilling(schoolId);
    if (result.success) {
      toast.success("School billing activated");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const filteredRevenues = revenues.filter((r) => {
    if (filter === "all") {return true;}
    return r.billingStatus === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-32 animate-skeleton rounded bg-surface-2" />
            </Card>
          ))}
        </div>
        <Card>
          <div className="h-96 animate-skeleton rounded bg-surface-2" />
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

  const totalRevenue = revenues.reduce((sum, r) => sum + r.monthlyRevenue, 0);
  const paidRevenue = revenues.filter((r) => r.billingStatus === "paid").reduce((sum, r) => sum + r.monthlyRevenue, 0);
  const pendingRevenue = revenues.filter((r) => r.billingStatus !== "paid").reduce((sum, r) => sum + r.monthlyRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-text-secondary">Total Monthly Revenue</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{formatINR(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-success-bg rounded-lg">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-text-secondary">Collected (Paid)</p>
              <p className="text-2xl font-bold text-success mt-1">{formatINR(paidRevenue)}</p>
            </div>
            <div className="p-3 bg-info-bg rounded-lg">
              <CheckCircle className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-text-secondary">Pending Collection</p>
              <p className="text-2xl font-bold text-warning mt-1">{formatINR(pendingRevenue)}</p>
            </div>
            <div className="p-3 bg-warning-bg rounded-lg">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Renewal Pipeline */}
      {renewals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand" />
              <CardTitle>Renewal Pipeline</CardTitle>
            </div>
            <CardDescription>Schools due for renewal in the next 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-danger-bg rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <span className="text-sm font-medium text-danger">Due in 30 Days</span>
                </div>
                <p className="text-2xl font-bold text-danger">
                  {renewals.filter((r) => r.tier === "30_days").length}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatINR(renewals.filter((r) => r.tier === "30_days").reduce((sum, r) => sum + r.monthlyRevenue, 0))}
                </p>
              </div>

              <div className="bg-warning-bg rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">Due in 60 Days</span>
                </div>
                <p className="text-2xl font-bold text-warning">
                  {renewals.filter((r) => r.tier === "60_days").length}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatINR(renewals.filter((r) => r.tier === "60_days").reduce((sum, r) => sum + r.monthlyRevenue, 0))}
                </p>
              </div>

              <div className="bg-info-bg rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium text-info">Due in 90 Days</span>
                </div>
                <p className="text-2xl font-bold text-info">
                  {renewals.filter((r) => r.tier === "90_days").length}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatINR(renewals.filter((r) => r.tier === "90_days").reduce((sum, r) => sum + r.monthlyRevenue, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>School Billing</CardTitle>
              <CardDescription>Manage billing for all schools</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-lg border border-border bg-surface-1 px-3 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              >
                <option value="all">All Schools</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Price/Student</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead>Profit Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevenues.map((school) => (
                <TableRow key={school.schoolId}>
                  <TableCell className="font-medium">{school.schoolName}</TableCell>
                  <TableCell>{school.studentCount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>{formatINRDecimal(school.pricePerStudent)}</TableCell>
                  <TableCell className="text-success font-medium">
                    {formatINRDecimal(school.monthlyRevenue)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        school.profitMargin >= 30
                          ? "success"
                          : school.profitMargin >= 0
                          ? "warning"
                          : "danger"
                      }
                    >
                      {school.profitMargin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        school.billingStatus === "paid"
                          ? "success"
                          : school.billingStatus === "overdue"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {school.billingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {school.nextBillingDate
                      ? new Date(school.nextBillingDate).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSendingToSchool(school)}
                        title="Send Invoice"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSchool(school)}
                        title="Edit Price"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {school.billingStatus !== "paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFreeze(school.schoolId)}
                          title="Freeze Billing"
                        >
                          <PauseCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRevenues.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              No schools found with the selected filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditPriceDialog
        open={editingSchool !== null}
        onOpenChange={(open) => !open && setEditingSchool(null)}
        school={editingSchool}
        onSave={handleSavePrice}
      />

      <SendInvoiceDialog
        open={sendingToSchool !== null}
        onOpenChange={(open) => !open && setSendingToSchool(null)}
        school={sendingToSchool}
        onSend={handleSendInvoice}
      />
    </div>
  );
}
