export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 animate-pulse">
        <div className="h-14 w-14 mx-auto mb-8 rounded-2xl bg-surface-2" />
        <div className="h-8 w-32 mx-auto mb-2 rounded bg-surface-2" />
        <div className="h-4 w-48 mx-auto mb-8 rounded bg-surface-2" />
        <div className="bg-surface-1 border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="h-12 rounded-lg bg-surface-2" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 rounded bg-surface-2" />
            <div className="h-12 rounded-lg bg-surface-2" />
          </div>
          <div className="h-12 rounded-lg bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
