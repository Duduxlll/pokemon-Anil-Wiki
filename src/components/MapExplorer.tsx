"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapLocation } from "@/lib/types";
import { normalizePokemonName } from "@/lib/pokemonName";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
function spriteUrl(dexId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;
}

export default function MapExplorer() {
  const [locations, setLocations] = useState<MapLocation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/locais")
      .then((r) => r.json())
      .then((d) => {
        setLocations(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const search = useMemo(() => {
    if (!locations || !query.trim()) return null;
    const q = normalizePokemonName(query);
    const map = new Map<string, { dexId: number; locais: string[] }>();
    for (const loc of locations) {
      for (const p of loc.pokemon) {
        if (normalizePokemonName(p.name).includes(q)) {
          if (!map.has(p.name)) map.set(p.name, { dexId: p.dexId, locais: [] });
          map.get(p.name)!.locais.push(loc.label);
        }
      }
    }
    return [...map.entries()].slice(0, 10);
  }, [locations, query]);

  const selectedLoc = locations?.find((l) => l.area === selected) ?? null;

  if (loading) {
    return (
      <div className="glass-strong rounded-3xl p-8 text-center text-white/60">
        Carregando o mapa de Kanto...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Busca: onde encontrar */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6">
        <label className="mb-2 block text-sm font-semibold text-white/80">
          Procurar um Pokémon (onde encontrar)
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex: Pikachu, Gastly, Abra..."
          className="glass-input w-full rounded-2xl px-4 py-3 text-base"
        />

        {search && (
          <div className="mt-4 flex flex-col gap-3">
            {search.length === 0 && (
              <p className="text-sm text-white/50">
                Não achei esse Pokémon nos locais de Kanto. (Pode ser inicial,
                evolução ou de outra região.)
              </p>
            )}
            {search.map(([name, info]) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/5 p-3"
              >
                <Image src={spriteUrl(info.dexId)} alt={name} width={56} height={56} unoptimized />
                <div className="flex-1">
                  <Link
                    href={`/pokemon/${name}`}
                    className="font-bold capitalize text-white hover:text-emerald-300"
                  >
                    {capitalize(name)}
                  </Link>
                  <p className="mt-0.5 text-sm text-white/70">
                    <span className="text-emerald-300">Encontra em:</span>{" "}
                    {info.locais.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de locais */}
      {!query && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-white text-glow">
            Locais de Kanto ({locations?.length ?? 0})
          </h2>
          <p className="mb-4 text-sm text-white/70 text-glow">
            Clique em um local pra ver os Pokémon que aparecem por lá.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {locations?.map((loc) => (
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
                <span className="text-xs text-white/50">
                  {loc.pokemon.length} Pokémon
                </span>
              </button>
            ))}
          </div>

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
      )}
    </div>
  );
}
