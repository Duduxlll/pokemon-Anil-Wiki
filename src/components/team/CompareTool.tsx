"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import PokemonAutocomplete from "../PokemonAutocomplete";
import TypeBadge from "../TypeBadge";
import { PokemonDetail, PokemonTypeName } from "@/lib/types";
import { TYPE_LABELS_PT } from "@/lib/typeMeta";
import { getMoveLabelPt } from "@/lib/moveNames";
import {
  EncounterAnalysis,
  MonProfile,
  ROLE_LABEL,
  WildMoves,
} from "@/lib/compare";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export interface TeamEntryWithDetail {
  id: string;
  name: string;
  level: number;
  detail: PokemonDetail | null;
}

const DECISION = {
  vale: { label: "VALE TROCAR", cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" },
  "so-futuro": { label: "VALE SÓ FUTURAMENTE", cls: "border-amber-400/40 bg-amber-500/15 text-amber-100" },
  "nao-vale": { label: "NÃO VALE TROCAR", cls: "border-rose-400/40 bg-rose-500/15 text-rose-100" },
} as const;

function noteColor(v: number) {
  if (v < 4) return "#f43f5e";
  if (v < 7) return "#f59e0b";
  return "#10b981";
}

function NoteBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-white/70">{label}</span>
        <span className="text-sm font-black" style={{ color: noteColor(value) }}>
          {value.toFixed(1)}
          <span className="text-[10px] font-normal text-white/40">/10</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${value * 10}%`, backgroundColor: noteColor(value) }}
        />
      </div>
    </div>
  );
}

const STAT_ROWS: { key: keyof MonProfile["stats"]; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "Ataque" },
  { key: "def", label: "Defesa" },
  { key: "spa", label: "At. Esp." },
  { key: "spd", label: "Def. Esp." },
  { key: "spe", label: "Velocidade" },
];

function StatGrid({ stats }: { stats: MonProfile["stats"] }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {STAT_ROWS.map((r) => {
        const v = stats[r.key];
        const pct = Math.min(100, (v / 200) * 100);
        const color = v < 60 ? "#f43f5e" : v < 95 ? "#f59e0b" : v < 130 ? "#22c55e" : "#38bdf8";
        return (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-white/60">{r.label}</span>
            <span className="w-8 shrink-0 text-right font-mono text-xs font-semibold text-white">
              {v}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypeList({ types, empty }: { types: PokemonTypeName[]; empty: string }) {
  if (types.length === 0) return <span className="text-xs text-white/40">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <TypeBadge key={t} type={t} size="sm" />
      ))}
    </div>
  );
}

function WildMovesView({ moves }: { moves: WildMoves }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-300">
          Golpes do tipo dele (STAB)
        </p>
        {moves.stab.length ? (
          <div className="flex flex-wrap gap-1.5">
            {moves.stab.map((m) => (
              <span key={m.name} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85">
                {getMoveLabelPt(m.name)} <span className="text-white/40">· {TYPE_LABELS_PT[m.type]}{m.power ? ` · ${m.power}` : ""}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-white/40">Nenhum liberado ainda.</span>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-300">Cobertura</p>
        {moves.coverage.length ? (
          <div className="flex flex-wrap gap-1.5">
            {moves.coverage.map((m) => (
              <span key={m.name} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85">
                {getMoveLabelPt(m.name)} <span className="text-white/40">· {TYPE_LABELS_PT[m.type]}{m.power ? ` · ${m.power}` : ""}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-white/40">Sem golpes de cobertura liberados.</span>
        )}
      </div>
      {moves.status.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-300">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {moves.status.map((m) => (
              <span key={m.name} className="rounded-full border border-violet-300/30 bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100">
                {getMoveLabelPt(m.name)}{m.ailmentPt ? ` · ${m.ailmentPt}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {moves.upcoming.length > 0 && (
        <p className="text-xs text-white/50">
          Ainda vai aprender:{" "}
          {moves.upcoming.map((m) => `${getMoveLabelPt(m.name)} (nv ${m.level})`).join(", ")}.
        </p>
      )}
    </div>
  );
}

function ProfileCard({ p, label, color }: { p: MonProfile; label: string; color: string }) {
  return (
    <div className="glass flex flex-col gap-2 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {p.image && (
          <Image src={p.image} alt={p.name} width={64} height={64} className="object-contain drop-shadow" unoptimized />
        )}
        <div>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
            {label}
          </span>
          <h4 className="font-semibold capitalize text-white">{capitalize(p.name)}</h4>
          <span className="text-xs text-white/55">Nv {p.level} · {ROLE_LABEL[p.role]}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      <StatGrid stats={p.stats} />
      <div className="grid grid-cols-1 gap-1.5 text-xs">
        <div>
          <span className="text-rose-300">Fraco a: </span>
          <span className="text-white/75">{p.weaknesses.length ? p.weaknesses.map((t) => TYPE_LABELS_PT[t]).join(", ") : "—"}</span>
        </div>
        <div>
          <span className="text-emerald-300">Resiste a: </span>
          <span className="text-white/75">{p.resistances.length ? p.resistances.map((t) => TYPE_LABELS_PT[t]).join(", ") : "—"}</span>
        </div>
        {p.immunities.length > 0 && (
          <div>
            <span className="text-white/60">Imune a: </span>
            <span className="text-white/75">{p.immunities.map((t) => TYPE_LABELS_PT[t]).join(", ")}</span>
          </div>
        )}
      </div>
      {p.willEvolve && (
        <p className="text-[11px] text-white/50">
          Evolui até {capitalize(p.finalName)} ({p.finalBst} de total base)
          {p.nextMinLevel ? `, a partir do nível ${p.nextMinLevel}` : ""}.
        </p>
      )}
    </div>
  );
}

export default function CompareTool({ team }: { team: TeamEntryWithDetail[] }) {
  const [wildName, setWildName] = useState("");
  const [wildLevel, setWildLevel] = useState("15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EncounterAnalysis | null>(null);

  async function runCompare(name: string) {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/comparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wild: { name: name.trim(), level: Number(wildLevel) || 1 },
          team: team.map((t) => ({ name: t.name, level: t.level })),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Erro ao analisar.");
      else setResult(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-strong rounded-3xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
        🧭 Encontrei um Pokémon na rota!
      </h2>
      <p className="mb-4 text-sm text-white/60">
        Diga qual Pokémon você encontrou. Eu faço uma análise completa: tipos,
        status, função, golpes, sinergia com a equipe e qual a melhor troca
        possível.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCompare(wildName);
        }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-white/80">Pokémon encontrado</label>
          <PokemonAutocomplete
            value={wildName}
            onChange={setWildName}
            onSelect={(name) => {
              setWildName(name);
              runCompare(name);
            }}
            placeholder="ex: Poliwhirl"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="mb-1 block text-sm font-semibold text-white/80">Nível</label>
          <input
            type="number"
            min={1}
            max={100}
            value={wildLevel}
            onChange={(e) => setWildLevel(e.target.value)}
            className="glass-input w-full rounded-lg px-3 py-2"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-accent px-6 py-2.5">
          {loading ? "Analisando..." : "Analisar"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.wild.name + result.wild.level}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            {result.noTeam ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-white/60">
                  Sua equipe principal está vazia — adicione membros pra eu comparar.
                  Por enquanto, aqui está o perfil do {capitalize(result.wild.name)}:
                </p>
                <ProfileCard p={result.wild} label="Selvagem" color="#f59e0b" />
                <div className="glass rounded-2xl p-4">
                  <WildMovesView moves={result.wildMoves} />
                </div>
              </div>
            ) : (
              <>
                {/* Veredito */}
                <div className={`rounded-2xl border p-4 ${DECISION[result.verdict.decision].cls}`}>
                  <span className="text-xs font-black tracking-wider opacity-80">
                    {DECISION[result.verdict.decision].label}
                  </span>
                  <p className="mt-1 text-base font-bold">{result.verdict.headline}</p>
                  <p className="mt-1 text-sm opacity-90">{result.verdict.summary}</p>
                </div>

                {/* Notas */}
                <div className="grid grid-cols-3 gap-2">
                  <NoteBar label="Força agora" value={result.scores.now} />
                  <NoteBar label="Força futura" value={result.scores.future} />
                  <NoteBar label="Encaixe no time" value={result.scores.fit} />
                </div>

                {/* Melhor troca */}
                {result.bestSwap && (
                  <div className="glass rounded-2xl p-4">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-violet-300">
                      Melhor troca possível
                    </h3>
                    {result.bestSwap.delta > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                        <div className="flex flex-col items-center">
                          {result.bestSwap.outImage && (
                            <Image src={result.bestSwap.outImage} alt={result.bestSwap.outName} width={64} height={64} unoptimized className="opacity-70" />
                          )}
                          <span className="text-xs text-rose-300">sai {capitalize(result.bestSwap.outName)}</span>
                        </div>
                        <span className="text-2xl text-white/40">→</span>
                        <div className="flex flex-col items-center">
                          {result.wild.image && (
                            <Image src={result.wild.image} alt={result.wild.name} width={72} height={72} unoptimized />
                          )}
                          <span className="text-xs text-emerald-300">entra {capitalize(result.wild.name)}</span>
                        </div>
                        <div className="ml-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-200">
                          Time +{result.bestSwap.delta} pts
                          <div className="text-[10px] font-normal text-white/55">
                            {result.bestSwap.scoreBefore} → {result.bestSwap.scoreAfter}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/70">
                        Nenhuma troca melhora o time — todos os seus 6 já rendem mais
                        que o {capitalize(result.wild.name)} nesse encaixe.
                      </p>
                    )}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-white/50 hover:text-white/80">
                        Ver todas as 6 trocas
                      </summary>
                      <ul className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                        {[...result.bestSwap.options]
                          .sort((a, b) => b.delta - a.delta)
                          .map((o) => (
                            <li key={o.outName} className="flex justify-between rounded-lg bg-white/5 px-2 py-1">
                              <span className="capitalize text-white/70">sai {capitalize(o.outName)}</span>
                              <span className={o.delta > 0 ? "text-emerald-300" : "text-white/40"}>
                                {o.delta > 0 ? "+" : ""}{o.delta}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </details>
                  </div>
                )}

                {/* Perfis lado a lado */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProfileCard p={result.wild} label="Novo" color="#f59e0b" />
                  {result.bestSwap && result.team.find((m) => m.name === result.bestSwap!.outName) && (
                    <ProfileCard
                      p={result.team.find((m) => m.name === result.bestSwap!.outName)!}
                      label="Candidato a sair"
                      color="#8b5cf6"
                    />
                  )}
                </div>

                {/* Golpes */}
                <div className="glass rounded-2xl p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-300">
                    Golpes do {capitalize(result.wild.name)}
                  </h3>
                  <WildMovesView moves={result.wildMoves} />
                </div>

                {/* Sinergia */}
                <div className="glass rounded-2xl p-4 text-sm">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-sky-300">
                    Sinergia com a equipe
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-white/55">Cobre fraqueza do time: </span>
                      <TypeList types={result.synergy.coversTeamWeakness} empty="nenhuma" />
                    </div>
                    <div>
                      <span className="text-white/55">Tipo novo no time: </span>
                      <TypeList types={result.synergy.bringsNewType} empty="nenhum" />
                    </div>
                    <div>
                      <span className="text-white/55">Cobertura ofensiva nova: </span>
                      <TypeList types={result.synergy.addsCoverage} empty="nenhuma" />
                    </div>
                    <div>
                      <span className="text-white/55">Repete tipo do time: </span>
                      <TypeList types={result.synergy.repeatsType} empty="não" />
                    </div>
                    {result.synergy.teamSharedWeaknesses.length > 0 && (
                      <div>
                        <span className="text-white/55">Fraquezas que seu time já repete: </span>
                        <TypeList types={result.synergy.teamSharedWeaknesses} empty="—" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Prós e contras */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="glass rounded-2xl p-4">
                    <h3 className="mb-2 text-sm font-bold text-emerald-300">✅ Pontos positivos</h3>
                    <ul className="flex flex-col gap-1.5 text-sm text-white/80">
                      {result.verdict.pros.length ? result.verdict.pros.map((p, i) => (
                        <li key={i} className="flex gap-2"><span className="text-emerald-300">•</span><span>{p}</span></li>
                      )) : <li className="text-white/40">—</li>}
                    </ul>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <h3 className="mb-2 text-sm font-bold text-rose-300">⚠️ Pontos negativos</h3>
                    <ul className="flex flex-col gap-1.5 text-sm text-white/80">
                      {result.verdict.cons.length ? result.verdict.cons.map((p, i) => (
                        <li key={i} className="flex gap-2"><span className="text-rose-300">•</span><span>{p}</span></li>
                      )) : <li className="text-white/40">—</li>}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
