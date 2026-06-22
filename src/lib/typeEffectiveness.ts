import { getTypeRelations } from "./pokeapi";
import { PokemonTypeName, TypeDamageRelations } from "./types";
import { TYPE_ORDER } from "./typeMeta";

function multiplierFor(
  attacker: PokemonTypeName,
  defenderRelations: TypeDamageRelations
): number {
  if (defenderRelations.noDamageFrom.includes(attacker)) return 0;
  if (defenderRelations.doubleDamageFrom.includes(attacker)) return 2;
  if (defenderRelations.halfDamageFrom.includes(attacker)) return 0.5;
  return 1;
}

export interface TypeEffectivenessEntry {
  type: PokemonTypeName;
  multiplier: number;
}

export async function getCombinedDefenseProfile(
  defendingTypes: PokemonTypeName[]
): Promise<TypeEffectivenessEntry[]> {
  const relations = await Promise.all(
    defendingTypes.map((t) => getTypeRelations(t))
  );

  return TYPE_ORDER.map((attacker) => {
    const multiplier = relations.reduce(
      (acc, rel) => acc * multiplierFor(attacker, rel),
      1
    );
    return { type: attacker, multiplier };
  }).sort((a, b) => b.multiplier - a.multiplier);
}

export async function buildTypeChart(): Promise<
  Record<PokemonTypeName, Record<PokemonTypeName, number>>
> {
  const allRelations = await Promise.all(
    TYPE_ORDER.map(async (t) => [t, await getTypeRelations(t)] as const)
  );

  const chart = {} as Record<PokemonTypeName, Record<PokemonTypeName, number>>;
  for (const attacker of TYPE_ORDER) {
    chart[attacker] = {} as Record<PokemonTypeName, number>;
    for (const [defender, rel] of allRelations) {
      chart[attacker][defender] = multiplierFor(attacker, rel);
    }
  }
  return chart;
}

export interface TypeMatchupRow {
  type: PokemonTypeName;
  doubleTo: PokemonTypeName[];
  halfTo: PokemonTypeName[];
  noneTo: PokemonTypeName[];
}

export function buildMatchupRows(
  chart: Record<PokemonTypeName, Record<PokemonTypeName, number>>
): TypeMatchupRow[] {
  return TYPE_ORDER.map((attacker) => {
    const doubleTo: PokemonTypeName[] = [];
    const halfTo: PokemonTypeName[] = [];
    const noneTo: PokemonTypeName[] = [];
    for (const defender of TYPE_ORDER) {
      const multiplier = chart[attacker][defender];
      if (multiplier === 2) doubleTo.push(defender);
      else if (multiplier === 0.5) halfTo.push(defender);
      else if (multiplier === 0) noneTo.push(defender);
    }
    return { type: attacker, doubleTo, halfTo, noneTo };
  });
}
