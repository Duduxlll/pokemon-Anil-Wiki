import { NextResponse } from "next/server";
import { getPokemonNameList } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET() {
  const list = await getPokemonNameList();
  return NextResponse.json(list);
}
