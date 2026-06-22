"use client";

import { motion } from "framer-motion";
import { PokemonTypeName } from "@/lib/types";
import { TypeMatchupRow } from "@/lib/typeEffectiveness";
import { TYPE_COLORS, TYPE_LABELS_PT, typeIconUrl } from "@/lib/typeMeta";
import Image from "next/image";

function MiniBadge({ type }: { type: PokemonTypeName }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-medium text-white shadow-sm transition-transform hover:scale-110"
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      <Image
        src={typeIconUrl(type)}
        alt={TYPE_LABELS_PT[type]}
        width={20}
        height={20}
        className="rounded-full"
        unoptimized
      />
      {TYPE_LABELS_PT[type]}
    </span>
  );
}

function BadgeList({ types }: { types: PokemonTypeName[] }) {
  if (types.length === 0) {
    return <span className="text-white/30">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <MiniBadge key={t} type={t} />
      ))}
    </div>
  );
}

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export default function TypeMatchupTable({ rows }: { rows: TypeMatchupRow[] }) {
  return (
    <div className="glass-strong overflow-hidden rounded-3xl">
      <div className="grid grid-cols-[150px_1fr_1fr_1fr] gap-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-wide sm:grid-cols-[180px_1fr_1fr_1fr]">
        <span className="text-white/60">Tipo</span>
        <span className="text-emerald-300">Dá 2×</span>
        <span className="text-rose-300">Dá ½×</span>
        <span className="text-white/50">Dá 0×</span>
      </div>

      <div>
        {rows.map((row, i) => (
          <motion.div
            key={row.type}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={rowVariants}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3), ease: "easeOut" }}
            whileHover={{ backgroundColor: "rgba(168,85,247,0.12)" }}
            className="grid grid-cols-[150px_1fr_1fr_1fr] items-center gap-4 border-b border-white/5 px-5 py-3 last:border-0 sm:grid-cols-[180px_1fr_1fr_1fr]"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: TYPE_COLORS[row.type] }}
              >
                <Image
                  src={typeIconUrl(row.type)}
                  alt={TYPE_LABELS_PT[row.type]}
                  width={26}
                  height={26}
                  unoptimized
                />
              </span>
              <span className="font-semibold text-white">
                {TYPE_LABELS_PT[row.type]}
              </span>
            </div>

            <BadgeList types={row.doubleTo} />
            <BadgeList types={row.halfTo} />
            <BadgeList types={row.noneTo} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
