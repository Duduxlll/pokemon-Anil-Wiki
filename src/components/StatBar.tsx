const MAX_STAT = 180;

export default function StatBar({ name, base }: { name: string; base: number }) {
  const pct = Math.min(100, (base / MAX_STAT) * 100);
  const color =
    base < 50 ? "#EF4444" : base < 90 ? "#F59E0B" : base < 130 ? "#22C55E" : "#38BDF8";

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-white/60">{name}</span>
      <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold text-white">
        {base}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
