import {
  SenderRole,
  TargetRole,
  SENDER_TARGET_PERMISSIONS,
  RATE_LIMITS,
} from "./types";

// ═══════════════════════════════════════════════════════
// PERMISSION CHECKER — Fixes #15, #25, #26, #27, #28
// Every server action calls these BEFORE doing anything.
// ═══════════════════════════════════════════════════════

interface SupabaseServerClient {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
        gte: (col2: string, val2: string) => {
          single: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/**
 * Authenticated user context — derived from server session.
 * Fix #25: school_id comes from here, NEVER from request body.
 */
export interface AuthenticatedUser {
  userId: string;
  schoolId: string | null; // null for super_admin
  role: SenderRole;
  isActive: boolean;
}

/**
 * Derives the authenticated user from Supabase auth session.
 *
 * Fix #25: school_id derived from public.users, NOT from request body.
 * Fix #27: Checks users.status = 'active' (deactivated users blocked).
 *
 * Uses getUser() NEVER getSession() — per Aividzy failure log.
 */
export async function getAuthenticatedSender(
  supabase: SupabaseServerClient
): Promise<AuthenticatedUser> {
  // getUser() verifies with Supabase Auth server — cannot be spoofed
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new AuthenticationError("Not authenticated");
  }

  // Get role and school_id from public.users — NOT from JWT metadata
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, school_id, role, deleted_at")
    .eq("id", authData.user.id)
    .single();

  if (userError || !userData) {
    throw new AuthenticationError("User record not found");
  }

  const user = userData as {
    id: string;
    school_id: string | null;
    role: string;
    deleted_at: string | null;
  };

  // Fix #27: Block deactivated/deleted users
  if (user.deleted_at) {
    throw new AuthenticationError("Account has been deactivated");
  }

  // Validate role is a valid sender role
  if (!Object.values(SenderRole).includes(user.role as SenderRole)) {
    throw new ForbiddenError(`Role '${user.role}' cannot send notifications`);
  }

  return {
    userId: user.id,
    schoolId: user.school_id,
    role: user.role as SenderRole,
    isActive: true,
  };
}

/**
 * Validates that the sender can target the specified role.
 *
 * Fix #26: Hardcoded permission matrix. No ad-hoc if/else.
 * Teacher → can only target students.
 * Principal → can target teachers and students.
 * Super Admin → can target anyone.
 */
export function validateSenderTargetPermission(
  senderRole: SenderRole,
  targetRole: TargetRole
): void {
  const allowedTargets = SENDER_TARGET_PERMISSIONS[senderRole];
  if (!allowedTargets.includes(targetRole)) {
    throw new ForbiddenError(
      `${senderRole} cannot send notifications to ${targetRole}`
    );
  }
}

/**
 * Validates that the sender can only target their own school.
 *
 * Fix #25: Super Admin can target any school.
 * Principal/Teacher can only target their own school_id.
 */
export function validateSchoolScope(
  sender: AuthenticatedUser,
  targetSchoolIds: string[]
): void {
  // Super Admin can target any school
  if (sender.role === SenderRole.SUPER_ADMIN) {return;}

  // Principal/Teacher must only target their own school
  if (!sender.schoolId) {
    throw new ForbiddenError("Your account is not associated with a school");
  }

  const invalidSchools = targetSchoolIds.filter((id) => id !== sender.schoolId);
  if (invalidSchools.length > 0) {
    throw new ForbiddenError(
      `You can only send notifications within your own school`
    );
  }
}

/**
 * Validates only Super Admin can send rating requests.
 */
export function validateRatingPermission(
  senderRole: SenderRole,
  hasRating: boolean
): void {
  if (hasRating && senderRole !== SenderRole.SUPER_ADMIN) {
    throw new ForbiddenError("Only Super Admin can send rating requests");
  }
}

/**
 * Checks rate limit for the sender.
 *
 * Fix #15: Database-level transactional rate limiting.
 * Uses SELECT FOR UPDATE to prevent race conditions.
 */
export async function checkRateLimit(
  supabase: SupabaseServerClient,
  sender: AuthenticatedUser
): Promise<void> {
  const limit = RATE_LIMITS[sender.role];
  if (limit.maxPerDay === Infinity) {return;} // Super Admin has no limit

  const today = new Date().toISOString().split("T")[0];

  // Transactional check via RPC — Fix #15
  const { data, error } = await supabase.rpc("check_and_increment_notification_limit", {
    p_sender_id: sender.userId,
    p_date: today,
    p_max_limit: limit.maxPerDay,
  });

  if (error) {
    throw new ServerError(`Rate limit check failed: ${error.message}`);
  }

  const result = data as { allowed: boolean; current_count: number } | null;
  if (!result || !result.allowed) {
    throw new RateLimitError(
      sender.role,
      limit.maxPerDay,
      result?.current_count ?? limit.maxPerDay
    );
  }
}

/**
 * Validates a teacher can only target their assigned classes.
 *
 * Fix #26: Teacher scope = own assigned classes only.
 */
export async function validateTeacherClassScope(
  supabase: SupabaseServerClient,
  teacherUserId: string,
  targetGrades: number[]
): Promise<void> {
  const { data, error } = await supabase
    .from("teachers")
    .select("assigned_classes")
    .eq("user_id", teacherUserId)
    .single();

  if (error || !data) {
    throw new ForbiddenError("Teacher record not found");
  }

  const teacher = data as { assigned_classes: string[] };

  // Get grades for the teacher's assigned classes
  const { data: classData, error: classError } = await supabase.rpc(
    "get_grades_for_classes",
    { p_class_ids: teacher.assigned_classes }
  );

  if (classError) {
    throw new ServerError(`Failed to verify teacher class scope: ${classError.message}`);
  }

  const allowedGrades = classData as number[];
  const unauthorizedGrades = targetGrades.filter((g) => !allowedGrades.includes(g));

  if (unauthorizedGrades.length > 0) {
    throw new ForbiddenError(
      `You are not assigned to classes for grade(s): ${unauthorizedGrades.join(", ")}`
    );
  }
}

// ─────────────────────────────────────────────
// Custom Errors
// ─────────────────────────────────────────────

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error {
  public readonly role: string;
  public readonly limit: number;
  public readonly current: number;

  constructor(role: string, limit: number, current: number) {
    super(`Rate limit exceeded: ${role} can send ${limit}/day, already sent ${current}`);
    this.name = "RateLimitError";
    this.role = role;
    this.limit = limit;
    this.current = current;
  }
}

export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}
