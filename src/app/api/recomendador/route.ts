import { NextRequest, NextResponse } from "next/server";
import { recommendMoveset } from "@/lib/moveset";

export async function GET(req: NextRequest) {
  const pokemon = req.nextUrl.searchParams.get("pokemon")?.trim().toLowerCase();
  const levelParam = req.nextUrl.searchParams.get("level");
  const level = levelParam ? parseInt(levelParam, 10) : NaN;

  if (!pokemon) {
    return NextResponse.json({ error: "Informe o nome do Pokémon." }, { status: 400 });
  }
  if (!Number.isFinite(level) || level < 1 || level > 100) {
    return NextResponse.json({ error: "Informe um nível entre 1 e 100." }, { status: 400 });
  }

  try {
    const result = await recommendMoveset(pokemon, level);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: `Pokémon "${pokemon}" não encontrado.` },
      { status: 404 }
    );
  }
}
