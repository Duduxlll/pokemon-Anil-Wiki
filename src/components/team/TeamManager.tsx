"use client";

import { CSSProperties, useState } from "react";
import { motion } from "framer-motion";
import { useTeamStorage } from "@/lib/useTeamStorage";
import { usePokemonDetails } from "@/lib/usePokemonDetails";
import { normalizePokemonName } from "@/lib/pokemonName";
import PokemonAutocomplete from "../PokemonAutocomplete";
import PokemonMiniCard from "./PokemonMiniCard";
import CompareTool from "./CompareTool";
import TeamStats from "./TeamStats";

export default function TeamManager() {
  const {
    entries,
    loaded,
    addPokemon,
    removePokemon,
    updateLevel,
    toggleInTeam,
    teamCount,
    maxTeamSize,
  } = useTeamStorage();

  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("5");

  const detailsMap = usePokemonDetails(entries.map((e) => e.name));

  const team = entries.filter((e) => e.inTeam);
  const box = entries.filter((e) => !e.inTeam);

  function handleAdd() {
    if (!newName.trim()) return;
    addPokemon(normalizePokemonName(newName), Math.max(1, Math.min(100, Number(newLevel) || 1)));
    setNewName("");
    setNewLevel("5");
  }

  const teamWithDetails = team.map((e) => ({
    id: e.id,
    name: normalizePokemonName(e.name),
    level: e.level,
    detail: detailsMap[normalizePokemonName(e.name)]?.data ?? null,
  }));

  if (!loaded) {
    return <p className="text-white/60">Carregando sua equipe...</p>;
  }

  return (
    <div
      className="flex flex-col gap-6"
      style={{ "--accent": "#8b5cf6" } as CSSProperties}
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Lateral: adicionar + estatísticas */}
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <section className="glass-strong rounded-3xl p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              ➕ Adicionar Pokémon
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-white/80">
                  Pokémon
                </label>
                <PokemonAutocomplete
                  value={newName}
                  onChange={setNewName}
                  onSelect={setNewName}
                  placeholder="ex: Pikachu"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-white/80">
                  Nível
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2"
                />
              </div>
              <button onClick={handleAdd} className="btn-accent w-full py-2.5">
                Adicionar à caixa
              </button>
            </div>
          </section>

          <TeamStats members={teamWithDetails} />
        </aside>

        {/* Centro: equipe + caixa */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          <section>
            <h2 className="mb-4 text-lg font-bold text-white text-glow">
              Equipe principal{" "}
              <span className="text-violet-300">
                ({teamCount}/{maxTeamSize})
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: maxTeamSize }, (_, i) => team[i]).map((entry, i) =>
                entry ? (
                  <PokemonMiniCard
                    key={entry.id}
                    detail={detailsMap[normalizePokemonName(entry.name)]?.data ?? null}
                    status={detailsMap[normalizePokemonName(entry.name)]?.status}
                    level={entry.level}
                    actions={
                      <div className="flex flex-col items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={entry.level}
                          onChange={(e) => updateLevel(entry.id, Number(e.target.value) || 1)}
                          className="glass-input w-14 rounded-md px-1 py-0.5 text-center text-xs"
                        />
                        <button
                          onClick={() => toggleInTeam(entry.id)}
                          className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
                        >
                          Tirar da equipe
                        </button>
                      </div>
                    }
                  />
                ) : (
                  <motion.div
                    key={`empty-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-full min-h-[150px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/15 p-4 text-center text-xs text-white/40"
                  >
                    <span className="text-2xl text-white/30">+</span>
                    Slot vazio
                  </motion.div>
                )
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold text-white text-glow">
              Caixa de Pokémon{" "}
              <span className="text-violet-300">({box.length})</span>
            </h2>
            {box.length === 0 ? (
              <p className="text-sm text-white/50">
                Nenhum Pokémon na caixa. Adicione capturas ao lado.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {box.map((entry) => {
                  const state = detailsMap[normalizePokemonName(entry.name)];
                  return (
                    <PokemonMiniCard
                      key={entry.id}
                      detail={state?.data ?? null}
                      status={state?.status}
                      level={entry.level}
                      actions={
                        <div className="flex flex-col items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={entry.level}
                            onChange={(e) => updateLevel(entry.id, Number(e.target.value) || 1)}
                            className="glass-input w-14 rounded-md px-1 py-0.5 text-center text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleInTeam(entry.id)}
                              disabled={teamCount >= maxTeamSize}
                              className="btn-accent px-2.5 py-1 text-xs"
                              title={
                                teamCount >= maxTeamSize
                                  ? "Equipe já tem 6 Pokémon"
                                  : "Colocar na equipe"
                              }
                            >
                              Pra equipe
                            </button>
                            <button
                              onClick={() => removePokemon(entry.id)}
                              className="rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/30"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <CompareTool team={teamWithDetails} />

      {entries.length === 0 && (
        <p className="text-center text-sm text-white/50">
          Você ainda não tem nenhum Pokémon salvo. Adicione o primeiro ao lado!
        </p>
      )}
    </div>
  );
}
