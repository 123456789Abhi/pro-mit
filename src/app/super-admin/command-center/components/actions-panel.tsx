"use client";

/**
 * Actions Panel Component
 * Quick actions for managing alerts, schools, and impersonation sessions.
 */

import { useState, useCallback } from "react";
import { resolveAlert, pauseSchool, triggerJob } from "@/lib/actions/super-admin/command-center";

interface ActionsPanelProps {
  selectedAlertId: string | null;
  activeImpersonations: number;
  onResolveAlert: (alertId: string, note: string) => void;
  onPauseSchool: (schoolId: string, reason: string) => void;
}

type ActionTab = "alerts" | "schools" | "jobs";

const JOB_TYPES = [
  { id: "process_content", label: "Process Content" },
  { id: "compute_metrics", label: "Compute Metrics" },
  { id: "send_notifications", label: "Send Notifications" },
  { id: "pregenerate_content", label: "Pre-generate Content" },
] as const;

export function ActionsPanel({
  selectedAlertId,
  activeImpersonations,
  onResolveAlert,
  onPauseSchool,
}: ActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>("alerts");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Alert resolution
  const [resolutionNote, setResolutionNote] = useState("");

  const handleResolveAlert = useCallback(async () => {
    if (!selectedAlertId || !resolutionNote.trim()) {return;}

    setIsLoading(true);
    setResult(null);

    try {
      const res = await resolveAlert(selectedAlertId, resolutionNote);
      if (res.success) {
        setResult({ type: "success", message: "Alert resolved successfully" });
        setResolutionNote("");
        onResolveAlert(selectedAlertId, resolutionNote);
      } else {
        setResult({ type: "error", message: res.error });
      }
    } catch (err) {
      setResult({ type: "error", message: "Failed to resolve alert" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAlertId, resolutionNote, onResolveAlert]);

  // School pause
  const [schoolIdToPause, setSchoolIdToPause] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  const handlePauseSchool = useCallback(async () => {
    if (!schoolIdToPause.trim() || !pauseReason.trim()) {return;}

    setIsLoading(true);
    setResult(null);

    try {
      const res = await pauseSchool(schoolIdToPause, pauseReason);
      if (res.success) {
        setResult({ type: "success", message: "School paused successfully" });
        setSchoolIdToPause("");
        setPauseReason("");
        onPauseSchool(schoolIdToPause, pauseReason);
      } else {
        setResult({ type: "error", message: res.error });
      }
    } catch (err) {
      setResult({ type: "error", message: "Failed to pause school" });
    } finally {
      setIsLoading(false);
    }
  }, [schoolIdToPause, pauseReason, onPauseSchool]);

  // Job trigger
  const [selectedJob, setSelectedJob] = useState<string>("");

  const handleTriggerJob = useCallback(async () => {
    if (!selectedJob) {return;}

    setIsLoading(true);
    setResult(null);

    try {
      const res = await triggerJob(selectedJob as "process_content" | "compute_metrics" | "send_notifications" | "pregenerate_content");
      if (res.success) {
        setResult({ type: "success", message: `Job triggered: ${res.jobId}` });
        setSelectedJob("");
      } else {
        setResult({ type: "error", message: res.error });
      }
    } catch (err) {
      setResult({ type: "error", message: "Failed to trigger job" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedJob]);

  return (
    <div className="rounded-xl border border-border bg-surface-1">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === "alerts"
              ? "border-b-2 border-brand text-brand"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Alerts
        </button>
        <button
          onClick={() => setActiveTab("schools")}
          className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === "schools"
              ? "border-b-2 border-brand text-brand"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Schools
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === "jobs"
              ? "border-b-2 border-brand text-brand"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Jobs
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Alert Actions */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Resolve Alert
              </h4>
              {selectedAlertId ? (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">
                    Alert ID: {selectedAlertId.slice(0, 8)}...
                  </p>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Resolution note (required)"
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    onClick={handleResolveAlert}
                    disabled={!resolutionNote.trim() || isLoading}
                    className="w-full rounded-md bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "Resolving..." : "Resolve Alert"}
                  </button>
                </div>
              ) : (
                <p className="rounded bg-surface-2 p-3 text-xs text-text-secondary">
                  Select an alert from the feed to resolve it.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Retry Failed Notifications
              </h4>
              <button
                disabled
                className="w-full rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-3 disabled:cursor-not-allowed"
              >
                Retry Failed (Coming Soon)
              </button>
            </div>
          </div>
        )}

        {/* School Actions */}
        {activeTab === "schools" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Pause School
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={schoolIdToPause}
                  onChange={(e) => setSchoolIdToPause(e.target.value)}
                  placeholder="School ID"
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Reason for pausing (required)"
                  rows={2}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  onClick={handlePauseSchool}
                  disabled={!schoolIdToPause.trim() || !pauseReason.trim() || isLoading}
                  className="w-full rounded-md bg-warning px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-warning/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Pausing..." : "Pause School"}
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Impersonation Sessions
              </h4>
              <div className="rounded bg-surface-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Active Sessions</span>
                  <span className={`text-lg font-semibold ${activeImpersonations > 0 ? "text-warning" : "text-success"}`}>
                    {activeImpersonations}
                  </span>
                </div>
                {activeImpersonations > 0 && (
                  <button className="mt-2 w-full rounded border border-warning/50 bg-warning/10 px-3 py-1.5 text-xs text-warning transition-colors hover:bg-warning/20">
                    View Impersonation Log
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Bulk Actions
              </h4>
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-3 disabled:cursor-not-allowed"
                >
                  Bulk Export (Coming Soon)
                </button>
                <button
                  disabled
                  className="w-full rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-3 disabled:cursor-not-allowed"
                >
                  Bulk Notify Schools (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-text-muted">
                Trigger Background Job
              </h4>
              <div className="space-y-3">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Select a job...</option>
                  {JOB_TYPES.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTriggerJob}
                  disabled={!selectedJob || isLoading}
                  className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Triggering..." : "Trigger Job"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 rounded-md p-3 text-sm ${
              result.type === "success"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
