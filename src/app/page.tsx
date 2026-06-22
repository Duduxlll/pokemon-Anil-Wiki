import { getPokemonSummaries } from "@/lib/pokeapi";
import PokedexGrid from "@/components/PokedexGrid";
import PageBackground from "@/components/PageBackground";
import { PokeballIcon } from "@/components/icons";

export const revalidate = 86400;

export default async function Home() {
  const pokemons = await getPokemonSummaries();

  return (
    <>
      <PageBackground
        src="/design-ref/pokedex-ref.png"
        objectPosition="center"
        tint="linear-gradient(180deg, rgba(7,11,31,0.38) 0%, rgba(7,11,31,0.48) 50%, rgba(5,6,15,0.85) 100%)"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 pb-20 sm:px-6 sm:py-16">
        <header className="mb-8">
          <span className="chip mb-3">
            <PokeballIcon className="h-4 w-4" /> Modo Completo · 9 gerações
          </span>
          <h1 className="text-4xl font-black text-white text-glow sm:text-5xl">
            Pokédex — <span className="text-amber-300">Pokémon Anil</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/85 text-glow">
            Todos os {pokemons.length} Pokémon do modo completo, das 9 gerações,
            com tipos, status, habilidades e movimentos.
          </p>
        </header>
        <PokedexGrid pokemons={pokemons} />
      </div>
    </>
  );
}
