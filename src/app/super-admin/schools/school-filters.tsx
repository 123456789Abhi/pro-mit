"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type SchoolFilters } from "./types";

interface SchoolFiltersProps {
  options: {
    cities: string[];
    regions: string[];
    statuses: string[];
    studentTiers: Record<string, number>;
    pricingTiers: Record<string, number>;
  };
  activeFilters: Partial<SchoolFilters>;
  onFiltersChange: (filters: Partial<SchoolFilters>) => void;
}

interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "radio";
  options: Array<{ value: string; label: string; count: number }>;
}

export function SchoolFilters({ options, activeFilters, onFiltersChange }: SchoolFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["status", "student_tier"]);

  const sections: FilterSection[] = [
    {
      id: "status",
      title: "Status",
      type: "checkbox",
      options: [
        { value: "trial", label: "Trial", count: 0 },
        { value: "active", label: "Active", count: 0 },
        { value: "frozen", label: "Frozen", count: 0 },
        { value: "churned", label: "Churned", count: 0 },
        { value: "suspended", label: "Suspended", count: 0 },
      ],
    },
    {
      id: "student_tier",
      title: "Student Count",
      type: "radio",
      options: [
        { value: "small", label: "Small (1-50)", count: options.studentTiers.small },
        { value: "medium", label: "Medium (51-200)", count: options.studentTiers.medium },
        { value: "large", label: "Large (201+)", count: options.studentTiers.large },
      ],
    },
    {
      id: "pricing_tier",
      title: "Pricing Tier",
      type: "radio",
      options: [
        { value: "economy", label: "Economy (< Rs.50)", count: options.pricingTiers.economy },
        { value: "standard", label: "Standard (Rs.50-150)", count: options.pricingTiers.standard },
        { value: "premium", label: "Premium (> Rs.150)", count: options.pricingTiers.premium },
      ],
    },
    {
      id: "city",
      title: "City",
      type: "checkbox",
      options: options.cities.map((city) => ({ value: city, label: city, count: 0 })),
    },
    {
      id: "region",
      title: "Region",
      type: "checkbox",
      options: options.regions.map((region) => ({ value: region, label: region, count: 0 })),
    },
    {
      id: "activity_level",
      title: "Activity Level",
      type: "radio",
      options: [
        { value: "active", label: "Active (7 days)", count: 0 },
        { value: "at_risk", label: "At Risk (30 days)", count: 0 },
        { value: "dormant", label: "Dormant (90+ days)", count: 0 },
      ],
    },
    {
      id: "expiry_window",
      title: "Subscription Expiry",
      type: "checkbox",
      options: [
        { value: "overdue", label: "Overdue", count: 0 },
        { value: "this_week", label: "This Week", count: 0 },
        { value: "this_month", label: "This Month", count: 0 },
        { value: "three_months", label: "3 Months", count: 0 },
        { value: "six_months_plus", label: "6+ Months", count: 0 },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleFilterChange = (sectionId: string, value: string, checked: boolean) => {
    const currentValues = ((activeFilters as Record<string, unknown>)[sectionId] as string[]) ?? [];

    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter((v) => v !== value);
    }

    onFiltersChange({
      ...activeFilters,
      [sectionId]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleRadioChange = (sectionId: string, value: string) => {
    const currentValue = (activeFilters as Record<string, unknown>)[sectionId] as string | undefined;
    onFiltersChange({
      ...activeFilters,
      [sectionId]: currentValue === value ? undefined : value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Filters</h3>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Clear all ({activeFilterCount})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({})}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4 text-text-muted" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const af = activeFilters as Record<string, unknown>;
          const isExpanded = expandedSections.includes(section.id);
          const activeCount = section.type === "checkbox"
            ? (((af[section.id] as string[]) ?? []).length)
            : (af[section.id] ? 1 : 0);

          return (
            <div key={section.id} className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{section.title}</span>
                  {activeCount > 0 && (
                    <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs text-white">
                      {activeCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-text-muted transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-border p-3 pt-0">
                  <div className="space-y-2">
                    {section.options.map((option) => {
                      const isChecked = section.type === "checkbox"
                        ? (((af[section.id] as string[]) ?? []).includes(option.value))
                        : (af[section.id] === option.value);

                      return (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-surface-2"
                        >
                          {section.type === "checkbox" ? (
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleFilterChange(section.id, option.value, !!checked)
                              }
                            />
                          ) : (
                            <input
                              type="radio"
                              name={section.id}
                              checked={isChecked}
                              onChange={() => handleRadioChange(section.id, option.value)}
                              className="h-4 w-4 accent-brand"
                            />
                          )}
                          <span className="flex-1 text-sm text-text-primary">{option.label}</span>
                          {option.count > 0 && (
                            <span className="text-xs text-text-muted">{option.count}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
