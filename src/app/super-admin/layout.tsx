import type { Metadata } from "next";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";

export const metadata: Metadata = {
  title: {
    template: "%s | Super Admin | Lernen",
    default: "Super Admin | Lernen",
  },
};

/**
 * Super Admin layout — wraps all /super-admin/* routes.
 * Provides sidebar navigation for 6 workflow pages:
 * 1. Command Center
 * 2. Schools
 * 3. Content Pipeline
 * 4. Communicate
 * 5. Financials
 * 6. Operations
 */
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
