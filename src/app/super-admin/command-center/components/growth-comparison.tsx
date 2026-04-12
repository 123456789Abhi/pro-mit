/**
 * Growth Comparison Component
 * Week-over-week and month-over-month growth metrics.
 */

interface GrowthComparisonProps {
  wow: {
    schools: number;
    students: number;
    revenue: number;
  };
  mom: {
    schools: number;
    students: number;
    revenue: number;
  };
}

function formatGrowth(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function GrowthCard({ label, wowValue, momValue }: { label: string; wowValue: number; momValue: number }) {
  const wowClass = wowValue > 0 ? "text-success" : wowValue < 0 ? "text-danger" : "text-text-secondary";
  const momClass = momValue > 0 ? "text-success" : momValue < 0 ? "text-danger" : "text-text-secondary";

  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase text-text-muted">WoW</p>
          <p className={`text-lg font-semibold ${wowClass}`}>{formatGrowth(wowValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-text-muted">MoM</p>
          <p className={`text-lg font-semibold ${momClass}`}>{formatGrowth(momValue)}</p>
        </div>
      </div>
    </div>
  );
}

export function GrowthComparison({ wow, mom }: GrowthComparisonProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <div className="border-b border-border p-4">
        <h3 className="font-medium text-text-primary">Growth Comparison</h3>
        <p className="text-xs text-text-secondary">Week-over-week and month-over-month</p>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4">
        <GrowthCard label="Schools" wowValue={wow.schools} momValue={mom.schools} />
        <GrowthCard label="Students" wowValue={wow.students} momValue={mom.students} />
        <GrowthCard label="Revenue" wowValue={wow.revenue} momValue={mom.revenue} />
      </div>
    </div>
  );
}
