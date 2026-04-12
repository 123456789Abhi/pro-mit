/**
 * Database type definitions for Supabase.
 *
 * IMPORTANT: This file should be auto-generated using:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
 *
 * Run this command after every migration to keep types in sync.
 * The placeholder below shows the expected shape.
 */

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          board: string;
          region: string | null;
          ai_assistant_name: string;
          academic_year: string;
          logo_url: string | null;
          primary_color: string | null;
          status: string;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["schools"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          school_id: string | null;
          email: string;
          name: string;
          initials: string | null;
          role: "super_admin" | "principal" | "teacher" | "student" | "parent";
          avatar_url: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      school_billing: {
        Row: {
          id: string;
          school_id: string;
          price_per_student: number;
          billing_status: "paid" | "unpaid" | "overdue" | null;
          billing_cycle: "monthly" | "annual" | null;
          last_billing_date: string | null;
          next_billing_date: string | null;
          monthly_ai_cost: number;
          monthly_infra_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["school_billing"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["school_billing"]["Insert"]>;
      };
      school_metrics: {
        Row: {
          id: string;
          school_id: string;
          student_count: number;
          active_students: number;
          monthly_active_students: number;
          avg_queries_per_student: number;
          last_updated: string;
        };
        Insert: Omit<Database["public"]["Tables"]["school_metrics"]["Row"], "id" | "last_updated">;
        Update: Partial<Database["public"]["Tables"]["school_metrics"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          school_id: string;
          billing_period: string;
          student_count: number;
          price_per_student: number;
          total_amount: number;
          status: "pending" | "paid" | "overdue" | null;
          created_by: string;
          created_at: string;
          paid_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      ai_request_log: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          model_used: string;
          grade_tier: string;
          grade: number;
          subject: string | null;
          cost_inr: number;
          tokens_used: number;
          response_time_ms: number;
          cached: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_request_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ai_request_log"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          sender_id: string;
          sender_role: string | null;
          school_id: string | null;
          recipient_id: string | null;
          recipient_role: string | null;
          title: string;
          body: string;
          type: string;
          priority: "low" | "medium" | "high" | null;
          status: "sent" | "delivered" | "read" | null;
          delivered_count: number;
          created_at: string;
          expires_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      billing_audit_log: {
        Row: {
          id: string;
          school_id: string;
          action: string;
          performed_by: string;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_audit_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["billing_audit_log"]["Insert"]>;
      };
      platform_settings: {
        Row: {
          id: number;
          default_price_per_student: number;
          infra_cost_per_school: number;
          billing_cycle: "monthly" | "annual" | null;
          min_students: number;
          updated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["platform_settings"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
      school_ai_budget: {
        Row: {
          id: string;
          school_id: string;
          monthly_budget: number;
          current_spend: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["school_ai_budget"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["school_ai_budget"]["Insert"]>;
      };
      monthly_revenue: {
        Row: {
          id: string;
          month: string;
          total_revenue: number;
          total_cost: number;
          mrr: number;
          active_schools: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["monthly_revenue"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["monthly_revenue"]["Insert"]>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      // Custom enums if any
    };
  };
};
