"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  ListChecks,
  HelpCircle,
  Pencil,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentTabProps {
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
}

const STATUS_CONFIG = {
  enabled: {
    label: "Enabled",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success-bg",
  },
  processing: {
    label: "Processing",
    icon: Clock,
    color: "text-info",
    bgColor: "bg-info-bg",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-danger",
    bgColor: "bg-danger-bg",
  },
};

export function ContentTab({ content }: ContentTabProps) {
  const [preGenSettings, setPreGenSettings] = useState(content.preGenSettings);
  const [retriggeringBooks, setRetriggeringBooks] = useState<Set<string>>(new Set());

  const handleRetrigger = async (bookId: string) => {
    setRetriggeringBooks((prev) => new Set(prev).add(bookId));
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRetriggeringBooks((prev) => {
      const newSet = new Set(prev);
      newSet.delete(bookId);
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Pre-generation Settings */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Pre-generated Content Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Configure which content types are automatically generated for this school when new books are added.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand/10 p-2">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-text-primary cursor-pointer">
                    Study Notes
                  </Label>
                  <p className="text-xs text-text-muted">
                    AI-generated topic summaries
                  </p>
                </div>
              </div>
              <Switch
                id="notes"
                checked={preGenSettings.notes}
                onCheckedChange={(checked) =>
                  setPreGenSettings((prev) => ({ ...prev, notes: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2">
                  <ListChecks className="h-5 w-5 text-success" />
                </div>
                <div>
                  <Label htmlFor="summaries" className="text-sm font-medium text-text-primary cursor-pointer">
                    Chapter Summaries
                  </Label>
                  <p className="text-xs text-text-muted">
                    Quick revision summaries
                  </p>
                </div>
              </div>
              <Switch
                id="summaries"
                checked={preGenSettings.summaries}
                onCheckedChange={(checked) =>
                  setPreGenSettings((prev) => ({ ...prev, summaries: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/10 p-2">
                  <HelpCircle className="h-5 w-5 text-info" />
                </div>
                <div>
                  <Label htmlFor="faq" className="text-sm font-medium text-text-primary cursor-pointer">
                    FAQ Generation
                  </Label>
                  <p className="text-xs text-text-muted">
                    Common questions & answers
                  </p>
                </div>
              </div>
              <Switch
                id="faq"
                checked={preGenSettings.faq}
                onCheckedChange={(checked) =>
                  setPreGenSettings((prev) => ({ ...prev, faq: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <Pencil className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <Label htmlFor="drills" className="text-sm font-medium text-text-primary cursor-pointer">
                    Practice Drills
                  </Label>
                  <p className="text-xs text-text-muted">
                    MCQ and practice questions
                  </p>
                </div>
              </div>
              <Switch
                id="drills"
                checked={preGenSettings.drills}
                onCheckedChange={(checked) =>
                  setPreGenSettings((prev) => ({ ...prev, drills: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      {content.processingQueue.length > 0 && (
        <Card className="border-border bg-surface-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processing Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.processingQueue.map((item) => (
              <div
                key={item.bookId}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-text-primary">{item.title}</p>
                    <div className="w-32 h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      item.status === "processing"
                        ? "bg-info-bg text-info border-info"
                        : "bg-surface-2 text-text-muted border-border"
                    )}
                  >
                    {item.status === "processing"
                      ? `${item.progress}%`
                      : item.status}
                  </Badge>
                </div>
                {item.status === "failed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleRetrigger(item.bookId)}
                    disabled={retriggeringBooks.has(item.bookId)}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        retriggeringBooks.has(item.bookId) && "animate-spin"
                      )}
                    />
                    {retriggeringBooks.has(item.bookId) ? "Retriggering..." : "Re-trigger"}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enabled Books Table */}
      <Card className="border-border bg-surface-1">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-text-primary flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Enabled Books
            </CardTitle>
            <p className="text-sm text-text-secondary">
              {content.enabledBooks.length} books enabled for this school
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-surface-2/50">
                  <TableHead>Book Title</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.enabledBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <BookOpen className="h-10 w-10 text-text-muted" />
                        <p className="text-text-secondary">No books enabled</p>
                        <p className="text-xs text-text-muted">
                          Enable books from the Content Library
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  content.enabledBooks.map((book) => {
                    const statusConfig = STATUS_CONFIG[book.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.enabled;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={book.id} className="border-border">
                        <TableCell>
                          <p className="font-medium text-text-primary">{book.title}</p>
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {book.publisher}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(statusConfig.bgColor, statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-text-secondary hover:text-text-primary"
                            >
                              <BookOpen className="h-3 w-3" />
                              View
                            </Button>
                            {book.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-warning hover:text-warning"
                                onClick={() => handleRetrigger(book.id)}
                                disabled={retriggeringBooks.has(book.id)}
                              >
                                <RefreshCw
                                  className={cn(
                                    "h-3 w-3",
                                    retriggeringBooks.has(book.id) && "animate-spin"
                                  )}
                                />
                              </Button>
                            )}
                          </div>
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

      {/* Info Notice */}
      <div className="rounded-lg bg-info-bg border border-info/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-info mt-0.5" />
          <div>
            <p className="text-sm font-medium text-info">Content Upload Policy</p>
            <p className="text-sm text-text-secondary mt-1">
              Only Super Admins can upload content to the master library. Principals and teachers
              can view and enable/disable books for their school, but cannot upload new content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
