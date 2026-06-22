"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { PokemonDetail } from "@/lib/types";
import { estimateStatsAtLevel } from "@/lib/statEstimate";
import { TYPE_COLORS } from "@/lib/typeMeta";
import TypeBadge from "../TypeBadge";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export default function PokemonMiniCard({
  detail,
  level,
  status,
  actions,
}: {
  detail: PokemonDetail | null;
  level: number;
  status?: "loading" | "ready" | "error";
  actions?: React.ReactNode;
}) {
  if (status === "loading" || !detail) {
    return (
      <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-white/40">
        {status === "error" ? "Erro ao carregar" : "Carregando..."}
      </div>
    );
  }

  const image = detail.artwork || detail.sprite;
  const { total } = estimateStatsAtLevel(detail.stats, level);
  const color = TYPE_COLORS[detail.types[0]];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="glass flex flex-col items-center gap-2 rounded-2xl p-4"
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${color}22, rgba(255,255,255,0.05) 70%)`,
      }}
    >
      <span
        className="self-end rounded-full px-2 py-0.5 text-xs font-bold text-white shadow"
        style={{ backgroundColor: color }}
      >
        Nv. {level}
      </span>
      {image && (
        <Image
          src={image}
          alt={detail.name}
          width={84}
          height={84}
          className="object-contain drop-shadow-lg"
          unoptimized
        />
      )}
      <h3 className="text-center font-semibold capitalize text-white">
        {capitalize(detail.name)}
      </h3>
      <div className="flex flex-wrap justify-center gap-1.5">
        {detail.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      <span className="text-xs text-white/50">Poder estimado: {total}</span>
      {actions && <div className="mt-1 flex gap-2">{actions}</div>}
    </motion.div>
  );
}
