"use client";

import { useEffect, useMemo, useState } from "react";
import { PokemonSummary, PokemonTypeName } from "@/lib/types";
import { TYPE_LABELS_PT, TYPE_ORDER } from "@/lib/typeMeta";
import PokemonCard from "./PokemonCard";
import TypeBadge from "./TypeBadge";

const PAGE_SIZE = 60;

export default function PokedexGrid({
  pokemons,
}: {
  pokemons: PokemonSummary[];
}) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<PokemonTypeName | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return pokemons.filter((p) => {
      const matchesQuery =
        query.trim() === "" ||
        p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        String(p.id).includes(query.trim());
      const matchesType = !activeType || p.types.includes(activeType);
      return matchesQuery && matchesType;
    });
  }, [pokemons, query, activeType]);

  useEffect(() => {
    setPage(1);
  }, [query, activeType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="glass-strong rounded-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome ou número (ex: Pikachu, 25)"
          className="glass-input w-full rounded-2xl px-4 py-3 text-base"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType(null)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
              activeType === null
                ? "bg-white text-[#0a1130] shadow-lg"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            Todos
          </button>
          {TYPE_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t === activeType ? null : t)}
              className={`rounded-full transition-all ${
                activeType === t
                  ? "scale-105 ring-2 ring-white/80"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <TypeBadge type={t} size="sm" />
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm font-medium text-white/60">
        {filtered.length} Pokémon encontrado{filtered.length !== 1 ? "s" : ""}
        {totalPages > 1 && ` — página ${currentPage} de ${totalPages}`}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {paginated.map((p) => (
          <PokemonCard key={p.id} pokemon={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-white/50">
          Nenhum Pokémon encontrado para &quot;{query}&quot;
          {activeType ? ` do tipo ${TYPE_LABELS_PT[activeType]}` : ""}.
        </p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="px-2 text-sm font-medium text-white/70">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-30"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
