"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import TypeBadge from "./TypeBadge";
import { PokemonForm, PokemonTypeName } from "@/lib/types";

interface EvoStage {
  name: string;
  minLevel: number | null;
  sprite: string;
  types: PokemonTypeName[];
}

interface ExtraData {
  forms: PokemonForm[];
  evolution: { stages: EvoStage[]; currentIndex: number };
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export default function PokemonExtras({ name }: { name: string }) {
  const [data, setData] = useState<ExtraData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    fetch(`/api/pokemon-extra/${name}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setData(d?.error ? null : d);
          setLoaded(true);
        }
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [name]);

  if (!loaded || !data) return null;

  const showEvo = data.evolution.stages.length > 1;
  const showForms = data.forms.length > 1;
  if (!showEvo && !showForms) return null;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {showEvo && (
        <section className="glass-strong rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Linha de evolução</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {data.evolution.stages.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                {i > 0 && (
                  <div className="flex flex-col items-center px-1 text-white/50">
                    <span className="text-xl">→</span>
                    {s.minLevel && <span className="text-[10px]">nv {s.minLevel}</span>}
                  </div>
                )}
                <Link
                  href={`/pokemon/${s.name}`}
                  className={`flex flex-col items-center rounded-2xl p-3 transition-all hover:bg-white/10 ${
                    s.name === name ? "bg-white/10 ring-2 ring-white/40" : ""
                  }`}
                >
                  {s.sprite && (
                    <Image
                      src={s.sprite}
                      alt={s.name}
                      width={84}
                      height={84}
                      className="object-contain drop-shadow"
                      unoptimized
                    />
                  )}
                  <span className="mt-1 text-sm font-semibold capitalize text-white">
                    {capitalize(s.name)}
                  </span>
                  <div className="mt-1 flex gap-1">
                    {s.types.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {showForms && (
        <section className="glass-strong rounded-3xl p-6">
          <h2 className="mb-1 text-lg font-bold text-white">Formas alternativas</h2>
          <p className="mb-4 text-sm text-white/60">
            Este Pokémon tem variações com tipos e status diferentes. Clique pra
            ver cada uma.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.forms.map((f) => (
              <motion.div
                key={f.name}
                whileHover={{ y: -4 }}
                className={`rounded-2xl border p-4 ${
                  f.name === name
                    ? "border-white/40 bg-white/10"
                    : "border-white/12 bg-white/5"
                }`}
              >
                <Link href={`/pokemon/${f.name}`} className="flex flex-col items-center">
                  {(f.artwork || f.sprite) && (
                    <Image
                      src={f.artwork || f.sprite}
                      alt={f.label}
                      width={96}
                      height={96}
                      className="object-contain drop-shadow-lg"
                      unoptimized
                    />
                  )}
                  <span className="mt-1 text-center text-sm font-bold text-white">
                    {f.label}
                  </span>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {f.types.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>
                  <span className="mt-1.5 text-xs text-white/50">Total base {f.bst}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
