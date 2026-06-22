import { MoveDetail } from "@/lib/types";
import { getMoveLabelPt } from "@/lib/moveNames";
import TypeBadge from "./TypeBadge";

const DAMAGE_CLASS_PT: Record<MoveDetail["damageClass"], string> = {
  physical: "Físico",
  special: "Especial",
  status: "Status",
};

export default function MoveCard({ move, rank }: { move: MoveDetail; rank?: number }) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl p-3">
      {rank !== undefined && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#0a1130] shadow-[0_4px_14px_-4px_#fbbf24]">
          {rank}
        </span>
      )}
      <div className="flex-1">
        <p className="font-semibold text-white">
          {getMoveLabelPt(move.name)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <TypeBadge type={move.type} size="sm" />
          <span className="text-xs text-white/50">
            {DAMAGE_CLASS_PT[move.damageClass]}
          </span>
        </div>
      </div>
      <div className="text-right text-xs text-white/60">
        <p>Poder: {move.power ?? "—"}</p>
        <p>Precisão: {move.accuracy ?? "—"}</p>
      </div>
    </div>
  );
}
