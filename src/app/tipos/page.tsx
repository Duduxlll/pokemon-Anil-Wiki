import { buildMatchupRows, buildTypeChart } from "@/lib/typeEffectiveness";
import TypeMatchupTable from "@/components/TypeMatchupTable";
import TypeOrbGrid from "@/components/TypeOrbGrid";
import PageBackground from "@/components/PageBackground";
import { DropIcon } from "@/components/icons";

export const revalidate = 86400;

export default async function TiposPage() {
  const chart = await buildTypeChart();
  const rows = buildMatchupRows(chart);

  return (
    <>
      <PageBackground
        src="/design-ref/tipos.png"
        objectPosition="center 38%"
        tint="linear-gradient(180deg, rgba(20,10,40,0.35) 0%, rgba(15,9,35,0.55) 50%, rgba(7,6,20,0.88) 100%)"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8 text-center">
          <span className="chip mb-3">
            <DropIcon className="h-4 w-4" /> 18 elementos
          </span>
          <h1 className="text-4xl font-black text-white text-glow sm:text-5xl">
            Tipos de Pokémon
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/85 text-glow">
            Cada tipo possui forças e fraquezas únicas. Conheça-as e monte a
            melhor estratégia para suas batalhas.
          </p>
        </header>

        <div className="glass mb-10 rounded-3xl p-6 sm:p-8">
          <TypeOrbGrid />
        </div>

        <h2 className="mb-2 text-xl font-bold text-white text-glow">
          Tabela de efetividade
        </h2>
        <p className="mb-5 text-sm text-white/80 text-glow">
          Para cada tipo, veja contra quem ele causa dano dobrado (2×), reduzido
          (½×) ou nenhum efeito (0×) ao atacar.
        </p>
        <TypeMatchupTable rows={rows} />
      </div>
    </>
  );
}
