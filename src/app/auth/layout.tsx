import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 animate-pulse">
            <div className="h-8 w-32 mx-auto mb-8 rounded bg-surface-2" />
            <div className="space-y-4">
              <div className="h-12 rounded-lg bg-surface-2" />
              <div className="h-12 rounded-lg bg-surface-2" />
              <div className="h-10 rounded-lg bg-surface-2" />
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
