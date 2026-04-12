"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Search,
  UserCog,
  UserPlus,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamTabProps {
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
}

const USAGE_ICONS = {
  high: TrendingUp,
  medium: Minus,
  low: TrendingDown,
  none: Activity,
};

const USAGE_COLORS = {
  high: "text-success",
  medium: "text-warning",
  low: "text-danger",
  none: "text-text-muted",
};

export function TeamTab({ team }: TeamTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [showAddTeacherDialog, setShowAddTeacherDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState<string | null>(null);
  const [impersonateType, setImpersonateType] = useState<string | null>(null);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(team.teachers.map((t) => t.department));
    return Array.from(depts).sort();
  }, [team.teachers]);

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return team.teachers.filter((teacher) => {
      const matchesSearch =
        !searchQuery ||
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = !departmentFilter || teacher.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [team.teachers, searchQuery, departmentFilter]);

  const totalStudents = team.studentsByClass.reduce((sum, c) => sum + c.count, 0);

  const handleImpersonate = (userId: string, type: string) => {
    setImpersonateType(type);
    setShowImpersonateDialog(userId);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="search"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-1 border-border"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={departmentFilter || ""}
            onChange={(e) => setDepartmentFilter(e.target.value || null)}
            className="h-10 rounded-lg border border-border bg-surface-1 px-3 text-sm text-text-primary"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Principal Card */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <User className="h-5 w-5" />
              Principal
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleImpersonate(team.principal.id, "Principal")}
            >
              <UserCog className="h-4 w-4" />
              Impersonate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Name</p>
              <p className="text-sm font-medium text-text-primary">{team.principal.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm text-text-primary">{team.principal.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Phone</p>
              <p className="text-sm text-text-primary">{team.principal.phone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Last Login</p>
              <p className="text-sm text-text-primary">
                {new Date(team.principal.last_login).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teachers
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                {filteredTeachers.length} of {team.teachers.length} teachers
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAddTeacherDialog(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-surface-2/50">
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead className="text-center">AI Adoption</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Users className="h-10 w-10 text-text-muted" />
                        <p className="text-text-secondary">No teachers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const UsageIcon = USAGE_ICONS[teacher.platform_usage as keyof typeof USAGE_ICONS] || Minus;
                    const usageColor = USAGE_COLORS[teacher.platform_usage as keyof typeof USAGE_COLORS] || "text-text-muted";

                    return (
                      <TableRow key={teacher.id} className="border-border">
                        <TableCell>
                          <div>
                            <p className="font-medium text-text-primary">{teacher.name}</p>
                            <p className="text-xs text-text-muted">{teacher.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {teacher.department}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects.map((subject) => (
                              <Badge
                                key={subject}
                                variant="outline"
                                className="text-xs bg-surface-2 border-border text-text-secondary"
                              >
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.assigned_classes.slice(0, 2).map((cls) => (
                              <Badge
                                key={cls}
                                variant="outline"
                                className="text-xs bg-surface-2 border-border text-text-secondary"
                              >
                                {cls}
                              </Badge>
                            ))}
                            {teacher.assigned_classes.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-surface-2 border-border text-text-muted"
                              >
                                +{teacher.assigned_classes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-surface-2 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  teacher.ai_adoption >= 75
                                    ? "bg-success"
                                    : teacher.ai_adoption >= 40
                                    ? "bg-warning"
                                    : "bg-danger"
                                )}
                                style={{ width: `${teacher.ai_adoption}%` }}
                              />
                            </div>
                            <span className="text-sm text-text-secondary w-8">
                              {teacher.ai_adoption}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <UsageIcon className={cn("h-4 w-4", usageColor)} />
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {new Date(teacher.last_login).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              teacher.status === "active"
                                ? "bg-success-bg text-success border-success"
                                : "bg-surface-2 text-text-muted border-border"
                            )}
                          >
                            {teacher.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-text-secondary hover:text-text-primary"
                            onClick={() => handleImpersonate(teacher.id, "Teacher")}
                          >
                            <UserCog className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Students by Class */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Students by Class
            <span className="ml-2 text-sm text-text-secondary font-normal">
              ({totalStudents.toLocaleString("en-IN")} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.studentsByClass.map((cls) => (
              <div
                key={cls.class}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 px-3 py-2"
              >
                <span className="text-sm text-text-primary font-medium">{cls.class}</span>
                <span className="text-sm text-text-secondary">{cls.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddTeacherDialog} onOpenChange={setShowAddTeacherDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Create a new teacher account or invite an existing user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Name</label>
              <Input placeholder="Enter teacher name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Email</label>
              <Input type="email" placeholder="teacher@school.edu.in" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Department</label>
              <select className="w-full h-10 rounded-lg border border-border bg-surface-1 px-3 text-sm text-text-primary">
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeacherDialog(false)}>
              Cancel
            </Button>
            <Button>Add Teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog open={!!showImpersonateDialog} onOpenChange={() => setShowImpersonateDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              You are about to impersonate a {impersonateType?.toLowerCase() || "user"}. This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-warning-bg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">Audit Warning</p>
                  <p className="text-sm text-text-secondary mt-1">
                    All actions taken while impersonating will be logged with your admin ID for compliance purposes.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpersonateDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Handle impersonation
                setShowImpersonateDialog(null);
              }}
            >
              Impersonate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
