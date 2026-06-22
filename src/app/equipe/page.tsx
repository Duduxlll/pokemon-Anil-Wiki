import TeamManager from "@/components/team/TeamManager";
import PageBackground from "@/components/PageBackground";
import { TeamIcon } from "@/components/icons";

export default function EquipePage() {
  return (
    <>
      <PageBackground
        src="/design-ref/equipe.png"
        objectPosition="center 35%"
        tint="linear-gradient(180deg, rgba(20,12,34,0.40) 0%, rgba(13,9,28,0.62) 45%, rgba(7,6,18,0.90) 100%)"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-8">
          <span className="chip mb-3">
            <TeamIcon className="h-4 w-4" /> Sua jornada
          </span>
          <h1 className="text-4xl font-black text-white text-glow sm:text-5xl">
            Minha <span className="text-violet-300">Equipe</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/85 text-glow">
            Guarde os Pokémon que você capturou, monte sua equipe principal de
            até 6 e descubra se vale a pena trocar quando encontrar um novo. Tudo
            salvo neste navegador.
          </p>
        </header>
        <TeamManager />
      </div>
    </>
  );
}
