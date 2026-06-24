"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  name: string;
  level: number;
}

export default function AiTeamAdvisor({ team }: { team: Member[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  async function run() {
    if (team.length === 0) return;
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/analise-equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: team.map((t) => ({ name: t.name, level: t.level })) }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Erro ao analisar.");
      else {
        setAdvice(data.advice);
        setScore(data.teamScore ?? null);
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-strong overflow-hidden rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            🤖 Treinador IA
          </h2>
          <p className="mt-1 text-sm text-white/60">
            A IA analisa sua equipe inteira e dá um conselho estratégico: se vale
            manter assim ou se falta algum tipo importante.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading || team.length === 0}
          className="btn-accent shrink-0 px-6 py-2.5"
        >
          {loading ? "Analisando..." : "Analisar minha equipe"}
        </button>
      </div>

      {team.length === 0 && (
        <p className="mt-3 text-sm text-white/50">
          Coloque Pokémon na sua equipe principal primeiro.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-violet-300/25 bg-violet-500/10 p-5"
          >
            {score !== null && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                Equilíbrio do time: <span className="text-violet-200">{score}/100</span>
              </div>
            )}
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/90">
              {advice
                .split(/\n+/)
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              Conselho gerado por IA (Gemini) com base nos dados reais da sua equipe.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
