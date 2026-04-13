"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSchool } from "@/lib/actions/super-admin/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const STEPS = [
  { id: 1, title: "School Info", description: "Basic school details" },
  { id: 2, title: "Principal Account", description: "Create or invite principal" },
  { id: 3, title: "Subscription", description: "Plan and billing" },
  { id: 4, title: "AI Budget", description: "Monthly limits" },
  { id: 5, title: "Branding", description: "GiNi customization" },
  { id: 6, title: "Content", description: "Enable books" },
  { id: 7, title: "Review", description: "Confirm details" },
];

export default function NewSchoolPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [principalMode, setPrincipalMode] = useState<"invite" | "create">("invite");

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: School Info
    name: "",
    board: "CBSE",
    city: "",
    region: "",
    academicYear: "2025-2026",
    // Step 2: Principal
    principalName: "",
    principalEmail: "",
    principalPhone: "",
    principalEmployeeId: "",
    principalPassword: "",
    // Step 3: Subscription
    plan: "trial",
    duration: "14",
    startDate: "",
    expiryDate: "",
    pricePerStudent: 50,
    // Step 4: AI Budget
    monthlyBudget: 10000,
    alertThreshold: 80,
    isCapped: false,
    resetDay: 1,
    // Step 5: Branding
    giniName: "GiNi",
    logoUrl: "",
    primaryColor: "#3b82f6",
    // Step 6: Content
    autoEnableBooks: true,
    enableNotes: true,
    enableSummaries: true,
    enableFaq: true,
    enableQuizzes: true,
    enableDrills: true,
  });

  const updateForm = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleCreate = async () => {
    setSubmitting(true);

    const result = await createSchool({
      name: formData.name,
      board: formData.board,
      city: formData.city,
      region: formData.region,
      academic_year: formData.academicYear,
      principal_invite_option: principalMode,
      principal_name: formData.principalName,
      principal_email: formData.principalEmail,
      principal_phone: formData.principalPhone || "",
      principal_employee_id: formData.principalEmployeeId || undefined,
      principal_password: principalMode === "create" ? formData.principalPassword || undefined : undefined,
      subscription_plan: formData.plan as "trial" | "paid",
      subscription_duration: formData.duration === "14" ? "14_days" : formData.duration === "1" ? "1_month" : formData.duration === "3" ? "3_months" : formData.duration === "6" ? "6_months" : "12_months",
      subscription_start_date: formData.startDate || new Date().toISOString().split("T")[0],
      subscription_expiry_date: formData.expiryDate || "",
      price_per_student_monthly: formData.pricePerStudent,
      min_billing_students: 1,
      ai_monthly_budget: formData.monthlyBudget,
      ai_alert_threshold: formData.alertThreshold,
      ai_is_capped: formData.isCapped,
      ai_reset_day: formData.resetDay,
      gini_name: formData.giniName,
      logo_url: formData.logoUrl || undefined,
      primary_color: formData.primaryColor,
      auto_enable_all_books: formData.autoEnableBooks,
      enable_notes: formData.enableNotes,
      enable_summaries: formData.enableSummaries,
      enable_faq: formData.enableFaq,
      enable_quizzes: formData.enableQuizzes,
      enable_drills: formData.enableDrills,
    });

    if (result.success) {
      toast.success("School created successfully");
      router.push("/super-admin/schools" as any);
    } else {
      toast.error(result.error || "Failed to create school");
    }

    setSubmitting(false);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= step.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {currentStep > step.id ? "✓" : step.id}
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-20 h-1 mx-2 ${
                  currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: School Info */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label>Board *</Label>
                <Select value={formData.board} onValueChange={(v) => updateForm("board", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CBSE">CBSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => updateForm("academicYear", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="region">Region *</Label>
                <Select value={formData.region} onValueChange={(v) => updateForm("region", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Principal Account */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Button
                  variant={principalMode === "invite" ? "default" : "outline"}
                  onClick={() => setPrincipalMode("invite")}
                >
                  Send Invite (Recommended)
                </Button>
                <Button
                  variant={principalMode === "create" ? "default" : "outline"}
                  onClick={() => setPrincipalMode("create")}
                >
                  Create Directly
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="principalName">Full Name *</Label>
                  <Input
                    id="principalName"
                    value={formData.principalName}
                    onChange={(e) => updateForm("principalName", e.target.value)}
                    placeholder="Enter principal's full name"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="principalEmail">Email *</Label>
                  <Input
                    id="principalEmail"
                    type="email"
                    value={formData.principalEmail}
                    onChange={(e) => updateForm("principalEmail", e.target.value)}
                    placeholder="principal@school.edu"
                  />
                </div>
                <div>
                  <Label htmlFor="principalPhone">Phone</Label>
                  <Input
                    id="principalPhone"
                    value={formData.principalPhone}
                    onChange={(e) => updateForm("principalPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <Label htmlFor="principalEmployeeId">Employee ID</Label>
                  <Input
                    id="principalEmployeeId"
                    value={formData.principalEmployeeId}
                    onChange={(e) => updateForm("principalEmployeeId", e.target.value)}
                  />
                </div>
                {principalMode === "create" && (
                  <div className="col-span-2">
                    <Label htmlFor="principalPassword">Temporary Password</Label>
                    <Input
                      id="principalPassword"
                      type="password"
                      value={formData.principalPassword}
                      onChange={(e) => updateForm("principalPassword", e.target.value)}
                      placeholder="Auto-generate or set manually"
                    />
                  </div>
                )}
              </div>

              {principalMode === "invite" && (
                <p className="text-sm text-muted-foreground">
                  Invitation link will be sent with 72-hour expiry. Principal sets own password.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Subscription */}
          {currentStep === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan *</Label>
                <Select value={formData.plan} onValueChange={(v) => updateForm("plan", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration</Label>
                <Select value={formData.duration} onValueChange={(v) => updateForm("duration", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 days (Trial)</SelectItem>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => updateForm("expiryDate", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="pricePerStudent">Price per Student/Month (₹)</Label>
                <Input
                  id="pricePerStudent"
                  type="number"
                  value={formData.pricePerStudent}
                  onChange={(e) => updateForm("pricePerStudent", parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Min billing: 1 student. Different schools can have different prices.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: AI Budget */}
          {currentStep === 4 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="monthlyBudget">Monthly Budget (₹)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  value={formData.monthlyBudget}
                  onChange={(e) => updateForm("monthlyBudget", parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  value={formData.alertThreshold}
                  onChange={(e) => updateForm("alertThreshold", parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="resetDay">Reset Day of Month</Label>
                <Input
                  id="resetDay"
                  type="number"
                  min={1}
                  max={28}
                  value={formData.resetDay}
                  onChange={(e) => updateForm("resetDay", parseInt(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  id="isCapped"
                  checked={formData.isCapped}
                  onCheckedChange={(checked) => updateForm("isCapped", checked)}
                />
                <Label htmlFor="isCapped">Cap AI usage at budget limit</Label>
              </div>
            </div>
          )}

          {/* Step 5: Branding */}
          {currentStep === 5 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="giniName">GiNi Assistant Name</Label>
                <Input
                  id="giniName"
                  value={formData.giniName}
                  onChange={(e) => updateForm("giniName", e.target.value)}
                  placeholder="GiNi"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="logoUrl">School Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => updateForm("logoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="w-16"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Content */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoEnableBooks"
                  checked={formData.autoEnableBooks}
                  onCheckedChange={(checked) => updateForm("autoEnableBooks", checked)}
                />
                <Label htmlFor="autoEnableBooks">
                  Auto-enable all CBSE books for Class 6-12
                </Label>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Pre-generated Content:</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "enableNotes", label: "Notes" },
                    { key: "enableSummaries", label: "Summaries" },
                    { key: "enableFaq", label: "FAQ" },
                    { key: "enableQuizzes", label: "Quizzes" },
                    { key: "enableDrills", label: "Drills" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox
                        id={item.key}
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onCheckedChange={(checked) => updateForm(item.key, checked)}
                      />
                      <Label htmlFor={item.key}>{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Only Super Admin can upload content to the master library.
                  Principal can enable/disable books for their school.
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">School Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd>{formData.name || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Board:</dt>
                      <dd>{formData.board}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">City:</dt>
                      <dd>{formData.city || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Region:</dt>
                      <dd>{formData.region || "—"}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Principal</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd>{formData.principalName || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd>{formData.principalEmail || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Method:</dt>
                      <dd>{principalMode === "invite" ? "Invite" : "Direct Create"}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Subscription</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Plan:</dt>
                      <dd className="capitalize">{formData.plan}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duration:</dt>
                      <dd>{formData.duration} days</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Price/Student:</dt>
                      <dd>₹{formData.pricePerStudent}/mo</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">AI Budget</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Monthly:</dt>
                      <dd>₹{formData.monthlyBudget.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Alert at:</dt>
                      <dd>{formData.alertThreshold}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Capped:</dt>
                      <dd>{formData.isCapped ? "Yes" : "No"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        {currentStep < 7 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create School"}
          </Button>
        )}
      </div>
    </div>
  );
}
