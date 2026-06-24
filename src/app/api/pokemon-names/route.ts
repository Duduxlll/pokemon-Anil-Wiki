import { NextResponse } from "next/server";
import { getSearchableNameList } from "@/lib/pokeapi";

export const revalidate = 86400;

export async function GET() {
  const list = await getSearchableNameList();
  return NextResponse.json(list);
}
