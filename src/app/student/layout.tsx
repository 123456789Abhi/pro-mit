import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Lernen",
    default: "Lernen",
  },
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
