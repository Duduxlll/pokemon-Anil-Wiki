import PageBackground from "@/components/PageBackground";
import MapExplorer from "@/components/MapExplorer";
import { MapIcon } from "@/components/icons";

export const revalidate = 86400;

export default function MapaPage() {
  return (
    <>
      <PageBackground
        src="/design-ref/tipos.png"
        objectPosition="center 38%"
        tint="linear-gradient(180deg, rgba(20,10,40,0.45) 0%, rgba(15,9,35,0.62) 50%, rgba(7,6,20,0.90) 100%)"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <span className="chip mb-3">
            <MapIcon className="h-4 w-4" /> Região de Kanto
          </span>
          <h1 className="text-4xl font-black text-white text-glow sm:text-5xl">
            Mapa de <span className="text-emerald-300">Pokémon Anil</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/85 text-glow">
            Descubra onde encontrar cada Pokémon: pesquise um nome pra ver os
            locais, ou explore cada região pra ver quem aparece por lá.
          </p>
        </header>

        <MapExplorer />

        <p className="mt-6 text-xs text-white/40">
          Dados de localização baseados na região de Kanto (PokéAPI), que o
          Pokémon Anil recria.
        </p>
      </div>
    </>
  );
}
