"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  MoreHorizontal,
  Eye,
  UserCog,
  Edit3,
  PauseCircle,
  ToggleLeft,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { SchoolStatus } from "./types";
import { SCHOOL_STATUS_CONFIG } from "./types";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc" | null;

interface SchoolsTableProps {
  schools: Array<{
    id: string;
    name: string;
    board: string;
    city: string | null;
    region: string | null;
    status: SchoolStatus;
    student_count: number;
    teacher_count: number;
    price_per_student_monthly: number;
    principal_name: string | null;
    created_at: string;
  }>;
  isLoading?: boolean;
  onViewDetails?: (schoolId: string) => void;
  onImpersonate?: (schoolId: string) => void;
  onEditSchool?: (schoolId: string) => void;
  onPauseAI?: (schoolId: string) => void;
  onChangeStatus?: (schoolId: string) => void;
  onExportData?: (schoolId: string) => void;
}

type SortKey = "name" | "student_count" | "price_per_student_monthly" | "created_at";

const PAGE_SIZE = 20;

export function SchoolsTable({
  schools,
  isLoading = false,
  onViewDetails,
  onImpersonate,
  onEditSchool,
  onPauseAI,
  onChangeStatus,
  onExportData,
}: SchoolsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Sort and filter schools
  const filteredSchools = useMemo(() => {
    let result = [...schools];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.city?.toLowerCase().includes(term) ||
          s.region?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const dir = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "created_at") {
        return dir * (new Date(aVal as string).getTime() - new Date(bVal as string).getTime());
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return dir * aVal.localeCompare(bVal);
      }
      return dir * ((aVal as number) - (bVal as number));
    });

    return result;
  }, [schools, searchTerm, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredSchools.length / PAGE_SIZE);
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSchools.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSchools.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 skeleton rounded-lg" />
          <div className="flex gap-2">
            <div className="h-10 w-24 skeleton rounded-lg" />
            <div className="h-10 w-24 skeleton rounded-lg" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 skeleton rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-1 p-3">
          <span className="text-sm text-text-secondary">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" className="text-xs">
            Change status
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Send notification
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Update AI budget
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                <th className="h-12 w-10 px-4 text-left">
                  <Checkbox
                    checked={selectedIds.size === paginatedSchools.length && paginatedSchools.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="h-12 px-4 text-left">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-text-primary"
                  >
                    School Name
                    {sortKey === "name" && sortDirection === "asc" && <ChevronUp className="h-3 w-3" />}
                    {sortKey === "name" && sortDirection === "desc" && <ChevronDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Principal
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Location
                </th>
                <th className="h-12 px-4 text-left">
                  <button
                    onClick={() => handleSort("student_count")}
                    className="flex items-center gap-1 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-text-primary"
                  >
                    Students
                    {sortKey === "student_count" && sortDirection === "asc" && <ChevronUp className="h-3 w-3" />}
                    {sortKey === "student_count" && sortDirection === "desc" && <ChevronDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Teachers
                </th>
                <th className="h-12 px-4 text-left">
                  <button
                    onClick={() => handleSort("price_per_student_monthly")}
                    className="flex items-center gap-1 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-text-primary"
                  >
                    Price
                    {sortKey === "price_per_student_monthly" && sortDirection === "asc" && <ChevronUp className="h-3 w-3" />}
                    {sortKey === "price_per_student_monthly" && sortDirection === "desc" && <ChevronDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="h-12 px-4 text-left">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="flex items-center gap-1 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-text-primary"
                  >
                    Joined
                    {sortKey === "created_at" && sortDirection === "asc" && <ChevronUp className="h-3 w-3" />}
                    {sortKey === "created_at" && sortDirection === "desc" && <ChevronDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="h-12 w-10 px-4 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSchools.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Building2 className="h-12 w-12 text-text-muted" />
                      <p className="text-text-secondary">No schools found</p>
                      <p className="text-xs text-text-muted">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSchools.map((school) => {
                  const statusConfig = SCHOOL_STATUS_CONFIG[school.status];
                  const isSelected = selectedIds.has(school.id);

                  return (
                    <tr
                      key={school.id}
                      className={cn(
                        "border-b border-border transition-colors table-row-hover",
                        isSelected && "bg-brand/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(school.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                            <Building2 className="h-5 w-5 text-text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{school.name}</p>
                            <p className="text-xs text-text-muted">{school.board}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {school.principal_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {[school.city, school.region].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {school.student_count.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {school.teacher_count}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        ₹{school.price_per_student_monthly.toLocaleString("en-IN")}/mo
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(school.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          schoolId={school.id}
                          onViewDetails={onViewDetails}
                          onImpersonate={onImpersonate}
                          onEditSchool={onEditSchool}
                          onPauseAI={onPauseAI}
                          onChangeStatus={onChangeStatus}
                          onExportData={onExportData}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Showing{" "}
            <span className="font-medium text-text-secondary">
              {((currentPage - 1) * PAGE_SIZE) + 1}
            </span>
            {" "}-{" "}
            <span className="font-medium text-text-secondary">
              {Math.min(currentPage * PAGE_SIZE, filteredSchools.length)}
            </span>
            {" "}of{" "}
            <span className="font-medium text-text-secondary">{filteredSchools.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-2 text-sm text-text-muted">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActions({
  schoolId,
  onViewDetails,
  onImpersonate,
  onEditSchool,
  onPauseAI,
  onChangeStatus,
  onExportData,
}: {
  schoolId: string;
  onViewDetails?: (id: string) => void;
  onImpersonate?: (id: string) => void;
  onEditSchool?: (id: string) => void;
  onPauseAI?: (id: string) => void;
  onChangeStatus?: (id: string) => void;
  onExportData?: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary hover:text-text-primary">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-text-secondary">Actions</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={() => onViewDetails?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <Eye className="h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImpersonate?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <UserCog className="h-4 w-4" />
          Impersonate principal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditSchool?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <Edit3 className="h-4 w-4" />
          Edit school
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={() => onPauseAI?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <PauseCircle className="h-4 w-4" />
          Pause AI
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeStatus?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <ToggleLeft className="h-4 w-4" />
          Change status
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={() => onExportData?.(schoolId)} className="flex items-center gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Export data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
