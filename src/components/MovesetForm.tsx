"use client";

import { useSearchParams } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MovesetRecommendation } from "@/lib/moveset";
import MoveCard from "./MoveCard";
import PokemonAutocomplete from "./PokemonAutocomplete";

export default function MovesetForm() {
  const searchParams = useSearchParams();
  const [pokemon, setPokemon] = useState(searchParams.get("pokemon") ?? "");
  const [level, setLevel] = useState(searchParams.get("level") ?? "20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MovesetRecommendation | null>(null);

  async function runSearch(p: string, lvl: string) {
    if (!p.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/recomendador?pokemon=${encodeURIComponent(p.trim())}&level=${lvl}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao buscar recomendação.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Erro de conexão com a PokéAPI.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const p = searchParams.get("pokemon");
    if (p) runSearch(p, searchParams.get("level") ?? "20");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ "--accent": "#fbbf24" } as CSSProperties}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(pokemon, level);
        }}
        className="glass-strong mb-8 flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold text-white/80">
            Pokémon
          </label>
          <PokemonAutocomplete
            value={pokemon}
            onChange={setPokemon}
            onSelect={(name) => {
              setPokemon(name);
              runSearch(name, level);
            }}
            placeholder="ex: Charizard"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="mb-1 block text-sm font-semibold text-white/80">
            Nível
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="glass-input w-full rounded-lg px-3 py-2"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-accent px-6 py-2.5">
          {loading ? "Buscando..." : "Recomendar"}
        </button>
      </form>

      {error && (
        <p className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="mb-1 text-2xl font-bold capitalize text-white text-glow">
            {result.pokemonName} — Nível {result.level}
          </h2>
          <p className="mb-5 text-sm text-white/60">
            {result.availableCount} movimento(s) liberado(s) até este nível.
          </p>

          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-300">
            ⭐ Kit recomendado
          </h3>
          <div className="mb-8 grid gap-2.5 sm:grid-cols-2">
            {result.recommended.map((m, i) => (
              <MoveCard key={m.name} move={m} rank={i + 1} />
            ))}
          </div>

          {result.otherAvailable.length > 0 && (
            <>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
                Outros movimentos disponíveis
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {result.otherAvailable.map((m) => (
                  <MoveCard key={m.name} move={m} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
