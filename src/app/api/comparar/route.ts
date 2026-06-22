import { NextRequest, NextResponse } from "next/server";
import { analyzeEncounter } from "@/lib/compare";
import { normalizePokemonName } from "@/lib/pokemonName";

export async function POST(req: NextRequest) {
  let body: {
    wild?: { name?: string; level?: number };
    team?: { name: string; level: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const rawName = body.wild?.name?.trim() ?? "";
  const name = normalizePokemonName(rawName);
  const level = Number(body.wild?.level);
  const team = Array.isArray(body.team) ? body.team : [];

  if (!name) {
    return NextResponse.json({ error: "Informe o Pokémon encontrado." }, { status: 400 });
  }
  if (!Number.isFinite(level) || level < 1 || level > 100) {
    return NextResponse.json({ error: "Informe um nível entre 1 e 100." }, { status: 400 });
  }

  try {
    const result = await analyzeEncounter(
      name,
      level,
      team.map((t) => ({ name: normalizePokemonName(String(t.name)), level: Number(t.level) || 1 }))
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: `Não encontrei o Pokémon "${rawName}". Confira o nome.` },
      { status: 404 }
    );
  }
}
