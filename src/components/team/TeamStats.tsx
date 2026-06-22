"use client";

import { motion } from "framer-motion";
import { PokemonDetail } from "@/lib/types";
import { estimateStatsAtLevel } from "@/lib/statEstimate";

interface Member {
  detail: PokemonDetail | null;
  level: number;
}

const AXES = [
  { key: "Ataque", short: "ATK" },
  { key: "Defesa", short: "DEF" },
  { key: "Velocidade", short: "VEL" },
  { key: "Defesa Especial", short: "DEF.E" },
  { key: "Ataque Especial", short: "ATK.E" },
];

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 76;

function pointFor(index: number, norm: number): [number, number] {
  const angle = ((-90 + index * 72) * Math.PI) / 180;
  const r = RADIUS * norm;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function coverageLabel(n: number): { label: string; tone: string } {
  if (n >= 6) return { label: "Ótima", tone: "text-emerald-300" };
  if (n >= 4) return { label: "Boa", tone: "text-sky-300" };
  if (n >= 2) return { label: "Média", tone: "text-amber-300" };
  return { label: "Limitada", tone: "text-rose-300" };
}

export default function TeamStats({ members }: { members: Member[] }) {
  const ready = members.filter(
    (m): m is { detail: PokemonDetail; level: number } => !!m.detail
  );

  const uniqueTypes = new Set<string>();
  ready.forEach((m) => m.detail.types.forEach((t) => uniqueTypes.add(t)));
  const diversity = uniqueTypes.size;

  const avgPower = ready.length
    ? Math.round(
        ready.reduce(
          (sum, m) => sum + estimateStatsAtLevel(m.detail.stats, m.level).total,
          0
        ) / ready.length
      )
    : 0;

  const statNorm = AXES.map((axis) => {
    if (!ready.length) return 0;
    const avg =
      ready.reduce(
        (sum, m) => sum + (m.detail.stats.find((s) => s.name === axis.key)?.base ?? 0),
        0
      ) / ready.length;
    return Math.min(1, avg / 150);
  });

  const polygon = statNorm.map((n, i) => pointFor(i, n).join(",")).join(" ");
  const ofens = coverageLabel(diversity);

  const rings = [0.33, 0.66, 1];

  return (
    <section className="glass-strong rounded-3xl p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
        📊 Estatísticas da equipe
      </h2>

      {ready.length === 0 ? (
        <p className="text-sm text-white/50">
          Adicione Pokémon à equipe principal para ver as estatísticas.
        </p>
      ) : (
        <>
          <div className="mb-4 space-y-2 text-sm">
            <Row label="Diversidade de tipos" value={`${diversity}`} />
            <Row label="Poder médio" value={`${avgPower}`} />
            <Row
              label="Cobertura"
              value={<span className={`font-bold ${ofens.tone}`}>{ofens.label}</span>}
            />
            <Row label="Membros" value={`${ready.length}/6`} />
          </div>

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="mx-auto h-52 w-52 overflow-visible"
          >
            {rings.map((ring) => (
              <polygon
                key={ring}
                points={AXES.map((_, i) => pointFor(i, ring).join(",")).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
              />
            ))}
            {AXES.map((axis, i) => {
              const [x, y] = pointFor(i, 1);
              const [lx, ly] = pointFor(i, 1.22);
              return (
                <g key={axis.key}>
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={x}
                    y2={y}
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.72)"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {axis.short}
                  </text>
                </g>
              );
            })}
            <motion.polygon
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              style={{ transformOrigin: "center" }}
              points={polygon}
              fill="rgba(139,92,246,0.35)"
              stroke="#a855f7"
              strokeWidth="2"
            />
            {statNorm.map((n, i) => {
              const [x, y] = pointFor(i, n);
              return <circle key={i} cx={x} cy={y} r="3" fill="#c4b5fd" />;
            })}
          </svg>
        </>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 pb-2">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
