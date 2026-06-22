import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { getPokemonDetail, getPokemonNameList } from "@/lib/pokeapi";
import { getCombinedDefenseProfile } from "@/lib/typeEffectiveness";
import { TYPE_COLORS } from "@/lib/typeMeta";
import { getMoveLabelPt } from "@/lib/moveNames";
import TypeBadge from "@/components/TypeBadge";
import StatBar from "@/components/StatBar";

export const revalidate = 86400;

export async function generateStaticParams() {
  const list = await getPokemonNameList();
  return list.map((p) => ({ name: p.name }));
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export default async function PokemonPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const nameList = await getPokemonNameList();
  const matchedEntry = nameList.find((p) => p.name === name.toLowerCase());
  const identifier = matchedEntry ? matchedEntry.id : name;

  let pokemon;
  try {
    pokemon = await getPokemonDetail(identifier);
  } catch {
    notFound();
  }

  const defenseProfile = await getCombinedDefenseProfile(pokemon.types);
  const weaknesses = defenseProfile.filter((e) => e.multiplier > 1);
  const resistances = defenseProfile.filter(
    (e) => e.multiplier < 1 && e.multiplier > 0
  );
  const immunities = defenseProfile.filter((e) => e.multiplier === 0);

  const image = pokemon.artwork || pokemon.sprite;
  const mainColor = TYPE_COLORS[pokemon.types[0]];
  const prevEntry = nameList.find((p) => p.id === pokemon.id - 1);
  const nextEntry = nameList.find((p) => p.id === pokemon.id + 1);

  return (
    <div
      className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6"
      style={{ "--accent": mainColor } as CSSProperties}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(900px 520px at 50% -8%, ${mainColor}40, transparent 62%)`,
        }}
      />

      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-white/70 transition-colors hover:text-white"
      >
        ← Voltar para a Pokédex
      </Link>

      <div className="glass-strong flex flex-col gap-8 rounded-3xl p-8 sm:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-56 w-56 items-center justify-center rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${mainColor}55, transparent 70%)`,
            }}
          >
            {image && (
              <Image
                src={image}
                alt={pokemon.name}
                width={220}
                height={220}
                className="animate-float-soft object-contain drop-shadow-2xl"
                unoptimized
                priority
              />
            )}
          </div>
          <span className="font-mono text-white/50">
            #{String(pokemon.id).padStart(3, "0")}
          </span>
        </div>

        <div className="flex-1">
          <h1 className="text-4xl font-black capitalize text-white text-glow">
            {capitalize(pokemon.name)}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <div className="mt-4 flex gap-6 text-sm text-white/70">
            <span>Altura: {(pokemon.height / 10).toFixed(1)} m</span>
            <span>Peso: {(pokemon.weight / 10).toFixed(1)} kg</span>
          </div>

          <div className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/50">
              Habilidades
            </h2>
            <div className="flex flex-wrap gap-2">
              {pokemon.abilities.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/90"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section className="glass-strong rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Status base</h2>
          <div className="flex flex-col gap-3">
            {pokemon.stats.map((s) => (
              <StatBar key={s.name} name={s.name} base={s.base} />
            ))}
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">
            Fraquezas e resistências
          </h2>

          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-rose-300">
              Fraco contra (recebe mais dano)
            </p>
            <div className="flex flex-wrap gap-2">
              {weaknesses.length === 0 && (
                <span className="text-sm text-white/40">Nenhuma</span>
              )}
              {weaknesses.map((w) => (
                <div key={w.type} className="flex items-center gap-1">
                  <TypeBadge type={w.type} size="sm" />
                  <span className="text-xs font-bold text-rose-300">
                    ×{w.multiplier}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-emerald-300">
              Resistente contra (recebe menos dano)
            </p>
            <div className="flex flex-wrap gap-2">
              {resistances.length === 0 && (
                <span className="text-sm text-white/40">Nenhuma</span>
              )}
              {resistances.map((w) => (
                <div key={w.type} className="flex items-center gap-1">
                  <TypeBadge type={w.type} size="sm" />
                  <span className="text-xs font-bold text-emerald-300">
                    ×{w.multiplier}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {immunities.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-white/60">Imune a</p>
              <div className="flex flex-wrap gap-2">
                {immunities.map((w) => (
                  <TypeBadge key={w.type} type={w.type} size="sm" />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="glass-strong mt-8 rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Movimentos aprendidos por nível
          </h2>
          <Link
            href={`/recomendador?pokemon=${pokemon.name}`}
            className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-[#0a1130] shadow-[0_6px_18px_-6px_#fbbf24] transition-transform hover:-translate-y-0.5"
          >
            Ver recomendação de moveset →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pokemon.moves.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="text-white/85">
                {getMoveLabelPt(m.name)}
              </span>
              <span className="font-mono text-xs text-white/45">
                {m.levelLearnedAt === 0 ? "Inicial" : `Nv. ${m.levelLearnedAt}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex justify-between text-sm font-semibold">
        {prevEntry ? (
          <Link
            href={`/pokemon/${prevEntry.name}`}
            className="rounded-full bg-white/10 px-4 py-2 text-white/80 transition-colors hover:bg-white/20"
          >
            ← Anterior
          </Link>
        ) : (
          <span />
        )}
        {nextEntry && (
          <Link
            href={`/pokemon/${nextEntry.name}`}
            className="rounded-full bg-white/10 px-4 py-2 text-white/80 transition-colors hover:bg-white/20"
          >
            Próximo →
          </Link>
        )}
      </div>
    </div>
  );
}
