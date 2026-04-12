"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, Download, ChevronRight } from "lucide-react";
import { SchoolsTable } from "./schools-table";
import { SchoolWizard } from "./school-wizard";
import { SchoolsSummary } from "./schools-summary";
import { SchoolFilters } from "./school-filters";
import { type SchoolStatus, type SchoolFilters as SFilters } from "./types";
import { cn } from "@/lib/utils";

interface SchoolsPageProps {
  initialSchools?: Array<{
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
  summary?: {
    total: number;
    byStatus: Record<string, number>;
    totalStudents: number;
    avgStudentsPerSchool: number;
  };
  filterOptions?: {
    cities: string[];
    regions: string[];
    statuses: string[];
    studentTiers: Record<string, number>;
    pricingTiers: Record<string, number>;
  };
  isLoading?: boolean;
}

export function SchoolsPageClient({
  initialSchools = [],
  summary,
  filterOptions,
  isLoading = false,
}: SchoolsPageProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SFilters>({});
  const [schools] = useState(initialSchools);

  const handleSchoolCreated = useCallback((newSchoolId: string) => {
    setSelectedSchoolId(newSchoolId);
    setActiveTab("details");
  }, []);

  const handleViewDetails = useCallback((schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setActiveTab("details");
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedSchoolId(null);
    setActiveTab("all");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-text-primary">
            Schools
          </h1>
          <p className="text-sm text-text-secondary">
            Manage all registered schools, onboarding, and settings
          </p>
        </div>
        <Button
          onClick={() => setActiveTab("add")}
          className="gap-2 btn-touch"
        >
          <Plus className="h-4 w-4" />
          Add New School
        </Button>
      </div>

      {summary && <SchoolsSummary summary={summary} />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger
            value="all"
            className={cn(
              "data-[state=active]:bg-brand data-[state=active]:text-white",
              "data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium",
              "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
              "transition-all"
            )}
          >
            All Schools
          </TabsTrigger>
          <TabsTrigger
            value="add"
            className={cn(
              "data-[state=active]:bg-brand data-[state=active]:text-white",
              "data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium",
              "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
              "transition-all"
            )}
          >
            Add New School
          </TabsTrigger>
          <TabsTrigger
            value="details"
            disabled={!selectedSchoolId}
            className={cn(
              "data-[state=active]:bg-brand data-[state=active]:text-white",
              "data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium",
              "bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary",
              "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            School Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                type="search"
                placeholder="Search schools by name, city, or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-surface-1 border-border"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 btn-touch border-border",
                showFilters && "bg-surface-2"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.keys(filters).length > 0 && (
                <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
                  {Object.keys(filters).length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="gap-2 btn-touch border-border"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {showFilters && filterOptions && (
            <SchoolFilters
              options={filterOptions}
              activeFilters={filters}
              onFiltersChange={setFilters}
            />
          )}

          <SchoolsTable
            schools={schools}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="add" className="mt-6">
          <SchoolWizard onSchoolCreated={handleSchoolCreated} />
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          {selectedSchoolId ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="gap-2 -ml-2 text-text-secondary hover:text-text-primary"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to All Schools
              </Button>
              <SchoolDetailsPlaceholder schoolId={selectedSchoolId} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-text-secondary">Select a school to view details</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SchoolDetailsPlaceholder({ schoolId: _schoolId }: { schoolId: string }) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-surface-2" />
      <div className="h-64 rounded bg-surface-2" />
    </div>
  );
}
