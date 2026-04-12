import { notFound } from "next/navigation";

import { type SchoolStatus } from "../types";
import { SchoolDetailTabs } from "./components/school-detail-tabs";
import { SCHOOL_STATUS_CONFIG } from "../types";

// Mock data for demonstration - in production, this would come from DB
const mockSchoolData = {
  id: "school-001",
  name: "Oakridge International School",
  board: "CBSE",
  city: "Bangalore",
  region: "Karnataka",
  ai_assistant_name: "GiNi",
  academic_year: "2026-2027",
  logo_url: null,
  primary_color: "#3b82f6",
  status: "active" as SchoolStatus,
  deleted_at: null,
  created_at: "2025-09-01T00:00:00Z",
  student_count: 450,
  teacher_count: 32,
  monthly_cost: 4250,
  monthly_revenue: 45000,
  ai_budget: 10000,
  ai_budget_used: 4250,
  ai_alert_threshold: 80,
  ai_is_capped: false,
  ai_reset_day: 1,
  price_per_student_monthly: 100,
  min_billing_students: 1,
  principal_id: "user-001",
  principal_name: "Ramaprashad Bhattacharya",
  principal_email: "ramaprashad.b@oakridge.edu.in",
  principal_phone: "+91 98765 43210",
  last_active_at: "2026-04-10T08:30:00Z",
  subscription_start_date: "2025-09-01",
  subscription_expiry_date: "2026-08-31",
};

// Mock team data
const mockTeamData = {
  principal: {
    id: "user-001",
    name: "Ramaprashad Bhattacharya",
    email: "ramaprashad.b@oakridge.edu.in",
    phone: "+91 98765 43210",
    last_login: "2026-04-10T08:30:00Z",
    employee_id: "EMP-001",
  },
  teachers: [
    {
      id: "teacher-001",
      name: "Priya Sharma",
      email: "priya.sharma@oakridge.edu.in",
      department: "Science",
      subjects: ["Physics", "Mathematics"],
      assigned_classes: ["10-A", "10-B", "11-A Science"],
      status: "active",
      ai_adoption: 85,
      platform_usage: "high",
      last_login: "2026-04-10T07:45:00Z",
    },
    {
      id: "teacher-002",
      name: "Rajesh Kumar",
      email: "rajesh.kumar@oakridge.edu.in",
      department: "Mathematics",
      subjects: ["Mathematics"],
      assigned_classes: ["9-A", "9-B", "10-A"],
      status: "active",
      ai_adoption: 92,
      platform_usage: "high",
      last_login: "2026-04-09T18:20:00Z",
    },
    {
      id: "teacher-003",
      name: "Anita Desai",
      email: "anita.desai@oakridge.edu.in",
      department: "Languages",
      subjects: ["English", "Hindi"],
      assigned_classes: ["6-A", "7-A", "8-A"],
      status: "active",
      ai_adoption: 67,
      platform_usage: "medium",
      last_login: "2026-04-08T16:00:00Z",
    },
    {
      id: "teacher-004",
      name: "Vikram Singh",
      email: "vikram.singh@oakridge.edu.in",
      department: "Commerce",
      subjects: ["Accounts", "Economics"],
      assigned_classes: ["11-B Commerce", "12-B Commerce"],
      status: "active",
      ai_adoption: 45,
      platform_usage: "low",
      last_login: "2026-04-05T10:15:00Z",
    },
    {
      id: "teacher-005",
      name: "Meera Patel",
      email: "meera.patel@oakridge.edu.in",
      department: "Science",
      subjects: ["Chemistry", "Biology"],
      assigned_classes: ["9-A", "9-B", "10-A"],
      status: "inactive",
      ai_adoption: 0,
      platform_usage: "none",
      last_login: "2026-03-15T09:00:00Z",
    },
  ],
  studentsByClass: [
    { class: "6-A", count: 28 },
    { class: "6-B", count: 30 },
    { class: "7-A", count: 32 },
    { class: "8-A", count: 25 },
    { class: "9-A", count: 35 },
    { class: "9-B", count: 32 },
    { class: "10-A", count: 38 },
    { class: "10-B", count: 35 },
    { class: "11-A Science", count: 40 },
    { class: "11-B Commerce", count: 28 },
    { class: "12-A Science", count: 42 },
    { class: "12-B Commerce", count: 25 },
  ],
};

// Mock AI & Costs data
const mockAICostsData = {
  monthlyBudget: 10000,
  budgetUsed: 4250,
  alertThreshold: 80,
  isCapped: false,
  resetDay: 1,
  costTrend: [
    { month: "Nov 2025", cost: 3200 },
    { month: "Dec 2025", cost: 3800 },
    { month: "Jan 2026", cost: 4100 },
    { month: "Feb 2026", cost: 3900 },
    { month: "Mar 2026", cost: 4400 },
    { month: "Apr 2026", cost: 4250 },
  ],
  usageStats: {
    totalQueries: 12847,
    cacheHitRate: 34.2,
    modelBreakdown: {
      "gemini-flash": 8450,
      "claude-haiku": 3297,
      "claude-sonnet": 1100,
    },
    topCostContributors: [
      { feature: "Quiz Generation", cost: 1850, percentage: 43.5 },
      { feature: "Test Paper Gen", cost: 1200, percentage: 28.2 },
      { feature: "Study Notes", cost: 720, percentage: 16.9 },
      { feature: "FAQ Generation", cost: 350, percentage: 8.2 },
      { feature: "Content Drills", cost: 130, percentage: 3.2 },
    ],
  },
  dailyUsage: [
    { date: "Apr 04", activeStudents: 312, avgQueriesPerStudent: 8.2 },
    { date: "Apr 05", activeStudents: 298, avgQueriesPerStudent: 7.5 },
    { date: "Apr 06", activeStudents: 345, avgQueriesPerStudent: 9.1 },
    { date: "Apr 07", activeStudents: 356, avgQueriesPerStudent: 8.8 },
    { date: "Apr 08", activeStudents: 310, avgQueriesPerStudent: 7.2 },
    { date: "Apr 09", activeStudents: 289, avgQueriesPerStudent: 6.8 },
    { date: "Apr 10", activeStudents: 198, avgQueriesPerStudent: 5.4 },
  ],
  costPerStudent: 9.44,
  costPerQuery: 0.33,
};

// Mock content data
const mockContentData = {
  enabledBooks: [
    {
      id: "book-001",
      title: "Science for Class 10",
      publisher: "NCERT",
      status: "enabled",
    },
    {
      id: "book-002",
      title: "Mathematics for Class 10",
      publisher: "NCERT",
      status: "enabled",
    },
    {
      id: "book-003",
      title: "English Beehive for Class 10",
      publisher: "NCERT",
      status: "enabled",
    },
    {
      id: "book-004",
      title: "Physics Part 1 for Class 11",
      publisher: "NCERT",
      status: "processing",
    },
    {
      id: "book-005",
      title: "Chemistry for Class 11",
      publisher: "NCERT",
      status: "failed",
    },
  ],
  preGenSettings: {
    notes: true,
    summaries: true,
    faq: true,
    drills: true,
  },
  processingQueue: [
    { bookId: "book-004", title: "Physics Part 1 for Class 11", status: "processing", progress: 67 },
    { bookId: "book-006", title: "Biology for Class 11", status: "queued", progress: 0 },
  ],
};

// Mock notifications data
const mockNotificationsData = {
  summary: {
    totalSent: 247,
    delivered: 238,
    read: 156,
    avgRating: 4.2,
  },
  recentNotifications: [
    {
      id: "notif-001",
      title: "Final Exam Schedule Released",
      sentAt: "2026-04-08T10:00:00Z",
      sentBy: "Ramaprashad Bhattacharya",
      recipients: "All Class 10 Students",
      status: "delivered",
      readCount: 68,
      totalCount: 73,
      rating: 4.5,
    },
    {
      id: "notif-002",
      title: "AI Quiz Challenge Winners",
      sentAt: "2026-04-05T14:30:00Z",
      sentBy: "Ramaprashad Bhattacharya",
      recipients: "Class 9-A, 9-B",
      status: "delivered",
      readCount: 62,
      totalCount: 67,
      rating: 4.8,
    },
    {
      id: "notif-003",
      title: "Science Fair Registration",
      sentAt: "2026-04-02T09:00:00Z",
      sentBy: "Priya Sharma",
      recipients: "Class 10 Students",
      status: "delivered",
      readCount: 45,
      totalCount: 73,
      rating: 4.0,
    },
    {
      id: "notif-004",
      title: "Parent-Teacher Meeting",
      sentAt: "2026-03-28T11:00:00Z",
      sentBy: "Ramaprashad Bhattacharya",
      recipients: "All Parents",
      status: "read",
      readCount: 156,
      totalCount: 180,
      rating: 4.3,
    },
  ],
  templatesUsed: [
    { name: "Exam Schedule", count: 12 },
    { name: "Holiday Notice", count: 8 },
    { name: "Achievement Award", count: 5 },
    { name: "Fee Reminder", count: 3 },
  ],
  feedbackReceived: 47,
  rateLimit: {
    daily: 10,
    usedToday: 2,
    resetsAt: "2026-04-11T00:00:00Z",
  },
};

interface PageProps {
  params: Promise<{ schoolId: string }>;
}

async function getSchoolData(schoolId: string) {
  // In production, fetch from Supabase
  // const supabase = await createSupabaseServer();
  // const { data: school } = await supabase.from('schools').select('*').eq('id', schoolId).single();

  // For now, return mock data
  return {
    ...mockSchoolData,
    id: schoolId,
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { schoolId } = await params;
  const school = await getSchoolData(schoolId);

  return {
    title: `${school.name} | Super Admin`,
    description: `Manage ${school.name} - ${school.board} school in ${school.city}, ${school.region}`,
  };
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const { schoolId } = await params;

  // Fetch all required data in parallel
  const [school, team, aiCosts, content, notifications] = await Promise.all([
    getSchoolData(schoolId),
    mockTeamData,
    mockAICostsData,
    mockContentData,
    mockNotificationsData,
  ]);

  if (!school) {
    notFound();
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(school.subscription_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-text-primary">
            {school.name}
          </h1>
          <p className="text-sm text-text-secondary">
            {school.board} Board • {school.city}, {school.region}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              SCHOOL_STATUS_CONFIG[school.status].bgColor
            } ${SCHOOL_STATUS_CONFIG[school.status].color}`}
          >
            {SCHOOL_STATUS_CONFIG[school.status].label}
          </span>
        </div>
      </div>

      {/* Main Content Tabs */}
      <SchoolDetailTabs
        school={school}
        team={team}
        aiCosts={aiCosts}
        content={content}
        notifications={notifications}
        daysRemaining={daysRemaining}
      />
    </div>
  );
}
