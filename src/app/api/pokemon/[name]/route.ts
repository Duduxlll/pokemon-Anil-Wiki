import { NextRequest, NextResponse } from "next/server";
import { getPokemonDetail } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const pokemon = await getPokemonDetail(name);
    return NextResponse.json(pokemon);
  } catch {
    return NextResponse.json(
      { error: `Pokémon "${name}" não encontrado.` },
      { status: 404 }
    );
  }
}
