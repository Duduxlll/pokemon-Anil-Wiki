import Image from "next/image";
import Link from "next/link";
import { CSSProperties } from "react";
import { PokemonSummary } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/typeMeta";
import TypeBadge from "./TypeBadge";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export default function PokemonCard({ pokemon }: { pokemon: PokemonSummary }) {
  const mainColor = TYPE_COLORS[pokemon.types[0]];
  const image = pokemon.artwork || pokemon.sprite;

  return (
    <Link
      href={`/pokemon/${pokemon.name}`}
      className="poke-card group relative flex flex-col items-center rounded-2xl p-4"
      style={{ "--accent": mainColor } as CSSProperties}
    >
      <span className="absolute right-3 top-3 font-mono text-xs text-white/40">
        #{String(pokemon.dexId).padStart(3, "0")}
      </span>
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${mainColor}55, ${mainColor}11 70%)`,
        }}
      >
        {image && (
          <Image
            src={image}
            alt={pokemon.name}
            width={96}
            height={96}
            className="object-contain drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
            unoptimized
          />
        )}
      </div>
      <h3 className="mt-2 text-center font-semibold capitalize text-white">
        {capitalize(pokemon.name)}
      </h3>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
    </Link>
  );
}
