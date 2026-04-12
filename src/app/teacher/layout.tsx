import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Teacher | Lernen",
    default: "Teacher | Lernen",
  },
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
