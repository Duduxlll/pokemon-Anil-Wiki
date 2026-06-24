"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import PokemonAutocomplete from "./PokemonAutocomplete";
import { EncounterByRegion, MapLocation } from "@/lib/types";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
function spriteUrl(dexId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;
}

interface EncResult {
  name: string;
  dexId: number;
  regions: EncounterByRegion[];
}

export default function MapExplorer() {
  const [locations, setLocations] = useState<MapLocation[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<EncResult | null>(null);
  const [loadingEnc, setLoadingEnc] = useState(false);
  const [encError, setEncError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/locais")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []))
      .catch(() => setLocations([]));
  }, []);

  async function search(name: string) {
    if (!name.trim()) return;
    setLoadingEnc(true);
    setEncError(null);
    setResult(null);
    try {
      const r = await fetch(`/api/encontros/${encodeURIComponent(name.trim())}`);
      const d = await r.json();
      if (!r.ok) setEncError(d.error ?? "Não encontrei esse Pokémon.");
      else setResult(d);
    } catch {
      setEncError("Erro de conexão.");
    } finally {
      setLoadingEnc(false);
    }
  }

  const selectedLoc = locations?.find((l) => l.area === selected) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Busca: onde encontrar (todas as gerações) */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6">
        <label className="mb-2 block text-sm font-semibold text-white/80">
          Procurar um Pokémon (onde encontrar)
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="flex-1">
            <PokemonAutocomplete
              value={query}
              onChange={setQuery}
              onSelect={(name) => {
                setQuery(name);
                search(name);
              }}
              placeholder="ex: Pikachu, Lucario, Garchomp..."
            />
          </div>
          <button type="submit" disabled={loadingEnc} className="btn-accent px-6 py-2.5">
            {loadingEnc ? "Procurando..." : "Buscar"}
          </button>
        </form>

        {encError && (
          <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-sm text-rose-200">
            {encError}
          </p>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <Image src={spriteUrl(result.dexId)} alt={result.name} width={64} height={64} unoptimized />
              <Link
                href={`/pokemon/${result.name}`}
                className="text-lg font-bold capitalize text-white hover:text-emerald-300"
              >
                {capitalize(result.name)}
              </Link>
            </div>
            {result.regions.length === 0 ? (
              <p className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/70">
                Esse Pokémon não aparece na natureza — costuma vir como inicial,
                evolução, fóssil, troca ou lendário.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {result.regions.map((reg) => (
                  <div key={reg.region}>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                      {reg.region}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {reg.locais.map((loc) => (
                        <span
                          key={loc}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85"
                        >
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Explorar locais de Kanto */}
      <div>
        <h2 className="mb-1 text-lg font-bold text-white text-glow">
          Explorar locais de Kanto {locations ? `(${locations.length})` : ""}
        </h2>
        <p className="mb-4 text-sm text-white/70 text-glow">
          Clique em um local pra ver os Pokémon que aparecem por lá. Pra outras
          regiões, use a busca acima.
        </p>
        {!locations ? (
          <p className="text-sm text-white/50">Carregando locais...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {locations.map((loc) => (
              <button
                key={loc.area}
                onClick={() => setSelected(loc.area === selected ? null : loc.area)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  loc.area === selected
                    ? "border-emerald-300/50 bg-emerald-500/15"
                    : "border-white/12 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="block text-sm font-semibold text-white">{loc.label}</span>
                <span className="text-xs text-white/50">{loc.pokemon.length} Pokémon</span>
              </button>
            ))}
          </div>
        )}

        {selectedLoc && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong mt-5 rounded-3xl p-5"
          >
            <h3 className="mb-3 text-base font-bold text-emerald-300">
              {selectedLoc.label} — {selectedLoc.pokemon.length} Pokémon
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {selectedLoc.pokemon.map((p) => (
                <Link
                  key={p.name}
                  href={`/pokemon/${p.name}`}
                  className="flex flex-col items-center rounded-xl p-2 transition-colors hover:bg-white/10"
                >
                  <Image src={spriteUrl(p.dexId)} alt={p.name} width={52} height={52} unoptimized />
                  <span className="text-center text-[11px] capitalize text-white/80">
                    {capitalize(p.name)}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
