export type PokemonTypeName =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export interface PokemonListItem {
  id: number;
  name: string;
}

export interface PokemonStat {
  name: string;
  base: number;
}

export interface PokemonMoveLearn {
  name: string;
  levelLearnedAt: number;
}

export interface PokemonSummary {
  id: number;
  dexId: number; // número da Pokédex para exibição (formas usam o do Pokémon base)
  name: string;
  types: PokemonTypeName[];
  sprite: string;
  spriteShiny: string | null;
  artwork: string | null;
}

export interface PokemonDetail extends PokemonSummary {
  speciesName: string;
  height: number;
  weight: number;
  stats: PokemonStat[];
  abilities: string[];
  moves: PokemonMoveLearn[];
}

export interface MoveDetail {
  name: string;
  type: PokemonTypeName;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: "physical" | "special" | "status";
  ailment: string | null; // sleep, paralysis, poison, burn, freeze, confusion...
  category: string | null; // damage, ailment, net-good-stats, damage+lower...
}

export interface PokemonForm {
  name: string;
  label: string;
  isDefault: boolean;
  types: PokemonTypeName[];
  sprite: string;
  artwork: string | null;
  stats: PokemonStat[];
  bst: number;
}

export interface EvolutionStage {
  name: string;
  minLevel: number | null;
}

export interface EvolutionPath {
  stages: EvolutionStage[];
  currentIndex: number;
}

export interface TypeDamageRelations {
  doubleDamageFrom: PokemonTypeName[];
  doubleDamageTo: PokemonTypeName[];
  halfDamageFrom: PokemonTypeName[];
  halfDamageTo: PokemonTypeName[];
  noDamageFrom: PokemonTypeName[];
  noDamageTo: PokemonTypeName[];
}
