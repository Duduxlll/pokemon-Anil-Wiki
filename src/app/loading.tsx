import { PokeballIcon } from "@/components/icons";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <PokeballIcon className="h-16 w-16 animate-poke-wiggle drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)]" />
      <p className="text-sm font-semibold text-white/70">Carregando...</p>
    </div>
  );
}
