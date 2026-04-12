// ═══════════════════════════════════════════════════════
// EDGE FUNCTION: send-scheduled-notifications
// Runs every 1 minute via Supabase pg_cron or CRON trigger.
//
// Fixes covered:
// #7  — Row-level lock prevents send-during-pause race
// #8  — Checks schools.status = 'active' before delivery
// #9  — Soft-deleted users skipped
// #20 — Idempotent: only sends to recipients not yet delivered
// #37 — Explicit IST timezone handling
// #38 — Batch processing: max 50 notifications per run
// #39 — Auto-expires notifications paused >90 days
// #48 — Flags notifications spanning academic year boundary
// ═══════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_NOTIFICATIONS_PER_RUN = 50; // Fix #38
const PAUSE_EXPIRY_DAYS = 90; // Fix #39

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results = {
    processed: 0,
    sent: 0,
    partiallyFailed: 0,
    failed: 0,
    expired: 0,
    errors: [] as string[],
  };

  try {
    // ── Step 1: Expire paused notifications older than 90 days (Fix #39) ──
    const { data: expiredData, error: expireError } = await supabase.rpc(
      "expire_stale_paused_notifications",
      { p_max_age_days: PAUSE_EXPIRY_DAYS }
    );

    if (expireError) {
      results.errors.push(`Expiry check failed: ${expireError.message}`);
    } else {
      results.expired = (expiredData as { count: number })?.count ?? 0;
    }

    // ── Step 2: Fetch due notifications with row-level lock (Fix #7) ──
    // Fix #37: Explicit IST timezone comparison
    const { data: dueNotifications, error: fetchError } = await supabase.rpc(
      "fetch_due_notifications_for_send",
      {
        p_limit: MAX_NOTIFICATIONS_PER_RUN,
        p_timezone: "Asia/Kolkata",
      }
    );

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Fetch failed: ${fetchError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const notifications = (dueNotifications ?? []) as Array<{
      id: string;
      target_role: string;
      target_schools: string[];
      target_departments: string[] | null;
      target_grades: number[] | null;
      target_streams: string[] | null;
      sender_id: string;
    }>;

    // ── Step 3: Process each notification ──
    for (const notif of notifications) {
      try {
        // Fix #8: Resolve recipients, filtering out deactivated schools
        const { data: resolveData, error: resolveError } = await supabase.rpc(
          "resolve_notification_recipients",
          {
            p_target_role: notif.target_role,
            p_target_schools: notif.target_schools,
            p_target_departments: notif.target_departments,
            p_target_grades: notif.target_grades,
            p_target_streams: notif.target_streams,
          }
        );

        if (resolveError) {
          // Mark as failed
          await supabase.rpc("finalize_notification_send", {
            p_notification_id: notif.id,
            p_delivered_count: 0,
            p_skipped_schools: 0,
            p_status: "failed",
            p_failure_reason: `Recipient resolution failed: ${resolveError.message}`,
          });
          results.failed++;
          results.errors.push(`Notification ${notif.id}: ${resolveError.message}`);
          continue;
        }

        const resolved = resolveData as {
          recipients: Array<{ userId: string; schoolId: string }>;
          skipped_schools: Array<{ school_id: string; reason: string }>;
        };

        // Fix #35: Zero recipients
        if (resolved.recipients.length === 0) {
          await supabase.rpc("finalize_notification_send", {
            p_notification_id: notif.id,
            p_delivered_count: 0,
            p_skipped_schools: resolved.skipped_schools.length,
            p_status: "failed",
            p_failure_reason: "No valid recipients found",
          });
          results.failed++;
          continue;
        }

        // Fix #20: Idempotent insert — skip recipients already in notification_recipients
        const { data: insertData, error: insertError } = await supabase.rpc(
          "insert_notification_recipients_idempotent",
          {
            p_notification_id: notif.id,
            p_recipients: JSON.stringify(resolved.recipients),
          }
        );

        if (insertError) {
          await supabase.rpc("finalize_notification_send", {
            p_notification_id: notif.id,
            p_delivered_count: 0,
            p_skipped_schools: 0,
            p_status: "failed",
            p_failure_reason: `Recipient insert failed: ${insertError.message}`,
          });
          results.failed++;
          results.errors.push(`Notification ${notif.id}: insert failed`);
          continue;
        }

        const insertResult = insertData as { inserted_count: number };

        // Determine final status
        const hasSkips = resolved.skipped_schools.length > 0;
        const finalStatus = hasSkips ? "partially_failed" : "sent";

        await supabase.rpc("finalize_notification_send", {
          p_notification_id: notif.id,
          p_delivered_count: insertResult.inserted_count,
          p_skipped_schools: resolved.skipped_schools.length,
          p_status: finalStatus,
          p_failure_reason: hasSkips
            ? `Skipped schools: ${resolved.skipped_schools.map((s) => s.reason).join("; ")}`
            : null,
        });

        // Write audit log
        await supabase.rpc("insert_audit_log", {
          p_notification_id: notif.id,
          p_actor_id: notif.sender_id,
          p_action: "sent",
          p_changes: JSON.stringify({
            delivered: insertResult.inserted_count,
            skipped: resolved.skipped_schools.length,
            trigger: "scheduled_edge_function",
          }),
          p_ip_address: "edge-function",
        });

        if (hasSkips) {
          results.partiallyFailed++;
        } else {
          results.sent++;
        }
        results.processed++;
      } catch (notifErr) {
        const errMsg = notifErr instanceof Error ? notifErr.message : "Unknown error";
        results.errors.push(`Notification ${notif.id}: ${errMsg}`);
        results.failed++;

        // Try to mark as failed
        try {
          await supabase.rpc("finalize_notification_send", {
            p_notification_id: notif.id,
            p_delivered_count: 0,
            p_skipped_schools: 0,
            p_status: "failed",
            p_failure_reason: errMsg,
          });
        } catch {
          // Last resort — log and continue
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, results }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
