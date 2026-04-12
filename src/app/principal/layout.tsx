import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Principal | Lernen",
    default: "Principal | Lernen",
  },
};

/**
 * Principal layout — wraps all /principal/* routes.
 * School context is auto-derived from authenticated user's school_id.
 * White-label theming applied via CSS variables from school config.
 */
export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — built as a shared component */}
      {/* <PrincipalSidebar /> */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
