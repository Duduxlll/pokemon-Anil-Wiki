import { NextResponse } from "next/server";
import { getKantoEncounterMap } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET() {
  try {
    const locations = await getKantoEncounterMap();
    return NextResponse.json(locations);
  } catch {
    return NextResponse.json(
      { error: "Não consegui carregar os locais agora." },
      { status: 502 }
    );
  }
}
