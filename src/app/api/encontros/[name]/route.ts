import { NextRequest, NextResponse } from "next/server";
import { getPokemonDetail, getPokemonEncounters } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    const [detail, regions] = await Promise.all([
      getPokemonDetail(name),
      getPokemonEncounters(name),
    ]);
    return NextResponse.json({ name: detail.name, dexId: detail.dexId, regions });
  } catch {
    return NextResponse.json(
      { error: `Não encontrei dados de "${name}".` },
      { status: 404 }
    );
  }
}
