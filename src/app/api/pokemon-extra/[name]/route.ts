import { NextRequest, NextResponse } from "next/server";
import { getEvolutionPath, getPokemonDetail, getPokemonForms } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const [forms, path] = await Promise.all([
      getPokemonForms(name),
      getEvolutionPath(name),
    ]);

    const stages = await Promise.all(
      path.stages.map(async (s) => {
        const d = await getPokemonDetail(s.name);
        return {
          name: d.name,
          minLevel: s.minLevel,
          sprite: d.artwork || d.sprite,
          types: d.types,
        };
      })
    );

    return NextResponse.json({
      forms,
      evolution: { stages, currentIndex: path.currentIndex },
    });
  } catch {
    return NextResponse.json(
      { error: `Não encontrei dados extras de "${name}".` },
      { status: 404 }
    );
  }
}
