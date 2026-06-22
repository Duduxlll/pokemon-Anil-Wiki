import { Suspense } from "react";
import MovesetForm from "@/components/MovesetForm";
import PageBackground from "@/components/PageBackground";
import { StarIcon } from "@/components/icons";

export default function RecomendadorPage() {
  return (
    <>
      <PageBackground
        src="/design-ref/recomendador.png"
        objectPosition="center 42%"
        tint="linear-gradient(180deg, rgba(18,12,34,0.40) 0%, rgba(12,10,28,0.62) 50%, rgba(7,6,16,0.90) 100%)"
      />

      <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <span className="chip mb-3">
            <StarIcon className="h-4 w-4" /> Estratégia de batalha
          </span>
          <h1 className="text-4xl font-black text-white text-glow sm:text-5xl">
            Recomendador de <span className="text-amber-400">Moveset</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/85 text-glow">
            Informe o Pokémon e o nível atual dele para descobrir os 4 melhores
            movimentos já liberados, equilibrando poder de ataque e cobertura de
            tipos.
          </p>
        </header>
        <Suspense>
          <MovesetForm />
        </Suspense>
      </div>
    </>
  );
}
