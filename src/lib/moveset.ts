import { getMoveDetails, getPokemonDetail } from "./pokeapi";
import { MoveDetail, PokemonMoveLearn } from "./types";

export interface MovesetRecommendation {
  pokemonName: string;
  level: number;
  availableCount: number;
  recommended: MoveDetail[];
  otherAvailable: MoveDetail[];
}

export async function recommendMoveset(
  pokemonName: string,
  level: number
): Promise<MovesetRecommendation> {
  const pokemon = await getPokemonDetail(pokemonName);

  const available: PokemonMoveLearn[] = pokemon.moves.filter(
    (m) => m.levelLearnedAt <= level
  );

  if (available.length === 0) {
    return {
      pokemonName: pokemon.name,
      level,
      availableCount: 0,
      recommended: [],
      otherAvailable: [],
    };
  }

  const moveNames = available.map((m) => m.name);
  const details = await getMoveDetails(moveNames);

  const damageMoves = details
    .filter((m) => m.damageClass !== "status" && m.power !== null)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
  const statusMoves = details.filter((m) => m.damageClass === "status");

  const recommended: MoveDetail[] = [];
  const seenTypes = new Set<string>();

  for (const move of damageMoves) {
    if (recommended.length >= 4) break;
    if (!seenTypes.has(move.type)) {
      recommended.push(move);
      seenTypes.add(move.type);
    }
  }

  for (const move of damageMoves) {
    if (recommended.length >= 4) break;
    if (!recommended.includes(move)) recommended.push(move);
  }

  for (const move of statusMoves) {
    if (recommended.length >= 4) break;
    recommended.push(move);
  }

  const otherAvailable = details.filter((m) => !recommended.includes(m));

  return {
    pokemonName: pokemon.name,
    level,
    availableCount: available.length,
    recommended,
    otherAvailable,
  };
}
