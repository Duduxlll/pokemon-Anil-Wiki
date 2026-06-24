import { getAbilityLabelPt } from "./abilityNames";
import { getFormLabel } from "./formNames";
import {
  EvolutionPath,
  EvolutionStage,
  MoveDetail,
  PokemonDetail,
  PokemonForm,
  PokemonListItem,
  PokemonSummary,
  PokemonTypeName,
  TypeDamageRelations,
} from "./types";
import { normalizePokemonName, resolvePokemonName } from "./pokemonName";

const API_BASE = "https://pokeapi.co/api/v2";
const TOTAL_POKEMON_COUNT = 1025; // Pokédex nacional completa (Gen 1 a Gen 9)
const REVALIDATE_SECONDS = 60 * 60 * 24;
const SUMMARY_FETCH_CONCURRENCY = 40;

async function apiFetch<T>(path: string, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (!res.ok) {
        throw new Error(`Falha ao buscar ${path}: ${res.status}`);
      }
      return res.json() as Promise<T>;
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
  throw new Error(`Falha ao buscar ${path}`);
}

export function getPokedexList(): PokemonListItem[] {
  return Array.from({ length: TOTAL_POKEMON_COUNT }, (_, i) => ({
    id: i + 1,
    name: "",
  }));
}

export function getPokemonTotalCount(): number {
  return TOTAL_POKEMON_COUNT;
}

interface RawNamedResource {
  name: string;
  url: string;
}

let nameListCache: PokemonListItem[] | null = null;

export async function getPokemonNameList(): Promise<PokemonListItem[]> {
  if (nameListCache) return nameListCache;
  const data = await apiFetch<{ results: RawNamedResource[] }>(
    `/pokemon?limit=${TOTAL_POKEMON_COUNT}`
  );
  nameListCache = data.results.map((r, i) => ({ id: i + 1, name: r.name }));
  return nameListCache;
}

interface RawPokemon {
  id: number;
  name: string;
  species: { name: string };
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: {
      ["official-artwork"]?: { front_default: string | null };
    };
  };
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  moves: {
    move: { name: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
      version_group: { name: string };
    }[];
  }[];
}

const STAT_LABELS_PT: Record<string, string> = {
  hp: "HP",
  attack: "Ataque",
  defense: "Defesa",
  "special-attack": "Ataque Especial",
  "special-defense": "Defesa Especial",
  speed: "Velocidade",
};

function toDetail(raw: RawPokemon): PokemonDetail {
  const levelMoves = raw.moves
    .map((m) => {
      const redBlue = m.version_group_details.find(
        (v) =>
          v.move_learn_method.name === "level-up" &&
          v.version_group.name === "red-blue"
      );
      const fallback = m.version_group_details.find(
        (v) => v.move_learn_method.name === "level-up"
      );
      const detail = redBlue ?? fallback;
      if (!detail) return null;
      return {
        name: m.move.name,
        levelLearnedAt: detail.level_learned_at,
      };
    })
    .filter((m): m is { name: string; levelLearnedAt: number } => m !== null)
    .sort((a, b) => a.levelLearnedAt - b.levelLearnedAt);

  return {
    id: raw.id,
    name: raw.name,
    speciesName: raw.species.name,
    types: raw.types.map((t) => t.type.name as PokemonTypeName),
    sprite: raw.sprites.front_default ?? "",
    spriteShiny: raw.sprites.front_shiny,
    artwork: raw.sprites.other?.["official-artwork"]?.front_default ?? null,
    height: raw.height,
    weight: raw.weight,
    stats: raw.stats.map((s) => ({
      name: STAT_LABELS_PT[s.stat.name] ?? s.stat.name,
      base: s.base_stat,
    })),
    abilities: raw.abilities.map((a) => getAbilityLabelPt(a.ability.name)),
    moves: levelMoves,
  };
}

export async function getPokemonDetail(
  idOrName: string | number
): Promise<PokemonDetail> {
  const identifier =
    typeof idOrName === "number" ? String(idOrName) : resolvePokemonName(idOrName);
  const raw = await apiFetch<RawPokemon>(`/pokemon/${identifier}`);
  return toDetail(raw);
}

function toSummary(detail: PokemonDetail): PokemonSummary {
  return {
    id: detail.id,
    name: detail.name,
    types: detail.types,
    sprite: detail.sprite,
    spriteShiny: detail.spriteShiny,
    artwork: detail.artwork,
  };
}

let summariesCache: PokemonSummary[] | null = null;
let summariesPromise: Promise<PokemonSummary[]> | null = null;

async function buildSummaries(): Promise<PokemonSummary[]> {
  const ids = Array.from({ length: TOTAL_POKEMON_COUNT }, (_, i) => i + 1);
  const summaries: PokemonSummary[] = [];

  for (let i = 0; i < ids.length; i += SUMMARY_FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + SUMMARY_FETCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) => getPokemonDetail(id))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        summaries.push(toSummary(result.value));
      }
    }
  }

  return summaries.sort((a, b) => a.id - b.id);
}

export async function getPokemonSummaries(): Promise<PokemonSummary[]> {
  // Cache em memória: a 1ª carga monta a lista; as próximas (voltar para a
  // Pokédex) retornam na hora, sem refazer 1025 requisições.
  if (summariesCache) return summariesCache;
  if (!summariesPromise) {
    summariesPromise = buildSummaries().then((result) => {
      summariesCache = result;
      return result;
    });
  }
  return summariesPromise;
}

interface RawType {
  id: number;
  name: string;
  damage_relations: {
    double_damage_from: { name: string }[];
    double_damage_to: { name: string }[];
    half_damage_from: { name: string }[];
    half_damage_to: { name: string }[];
    no_damage_from: { name: string }[];
    no_damage_to: { name: string }[];
  };
}

export async function getTypeRelations(
  type: PokemonTypeName
): Promise<TypeDamageRelations> {
  const raw = await apiFetch<RawType>(`/type/${type}`);
  const r = raw.damage_relations;
  return {
    doubleDamageFrom: r.double_damage_from.map((t) => t.name as PokemonTypeName),
    doubleDamageTo: r.double_damage_to.map((t) => t.name as PokemonTypeName),
    halfDamageFrom: r.half_damage_from.map((t) => t.name as PokemonTypeName),
    halfDamageTo: r.half_damage_to.map((t) => t.name as PokemonTypeName),
    noDamageFrom: r.no_damage_from.map((t) => t.name as PokemonTypeName),
    noDamageTo: r.no_damage_to.map((t) => t.name as PokemonTypeName),
  };
}

interface RawMove {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: string };
  meta: {
    ailment: { name: string } | null;
    category: { name: string } | null;
  } | null;
}

export async function getMoveDetail(name: string): Promise<MoveDetail> {
  const raw = await apiFetch<RawMove>(`/move/${name}`);
  const ailment = raw.meta?.ailment?.name ?? null;
  return {
    name: raw.name,
    type: raw.type.name as PokemonTypeName,
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
    damageClass: raw.damage_class.name as "physical" | "special" | "status",
    ailment: ailment && ailment !== "none" ? ailment : null,
    category: raw.meta?.category?.name ?? null,
  };
}

export async function getMoveDetails(names: string[]): Promise<MoveDetail[]> {
  return Promise.all(names.map((n) => getMoveDetail(n)));
}

interface RawEvoNode {
  species: { name: string; url: string };
  evolution_details: { min_level: number | null }[];
  evolves_to: RawEvoNode[];
}

interface RawSpecies {
  evolution_chain: { url: string } | null;
}

// Retorna o caminho evolutivo linear que passa pelo Pokémon informado
// (base → ... → forma final), com o nível em que cada estágio evolui.
export async function getEvolutionPath(name: string): Promise<EvolutionPath> {
  const id = normalizePokemonName(name);
  const species = await apiFetch<RawSpecies>(`/pokemon-species/${id}`);
  if (!species.evolution_chain?.url) {
    return { stages: [{ name: id, minLevel: null }], currentIndex: 0 };
  }
  const chainId = species.evolution_chain.url.split("/").filter(Boolean).pop();
  const chain = await apiFetch<{ chain: RawEvoNode }>(
    `/evolution-chain/${chainId}`
  );

  const paths: EvolutionStage[][] = [];
  const walk = (node: RawEvoNode, acc: EvolutionStage[]) => {
    const stage: EvolutionStage = {
      name: node.species.name,
      minLevel: node.evolution_details[0]?.min_level ?? null,
    };
    const next = [...acc, stage];
    if (node.evolves_to.length === 0) {
      paths.push(next);
      return;
    }
    for (const child of node.evolves_to) walk(child, next);
  };
  walk(chain.chain, []);

  const chosen = paths.find((p) => p.some((s) => s.name === id)) ?? paths[0];
  const currentIndex = Math.max(
    0,
    chosen.findIndex((s) => s.name === id)
  );
  return { stages: chosen, currentIndex };
}

interface RawSpeciesVarieties {
  varieties: { is_default: boolean; pokemon: { name: string } }[];
}

// Retorna todas as formas/variedades de um Pokémon (ex.: Marowak normal e de Alola).
export async function getPokemonForms(name: string): Promise<PokemonForm[]> {
  const id = String(name).toLowerCase();
  let species: RawSpeciesVarieties;
  try {
    species = await apiFetch<RawSpeciesVarieties>(`/pokemon-species/${id}`);
  } catch {
    // o nome pode ser de uma forma (ex.: marowak-alola) — descobre a espécie base
    const p = await apiFetch<{ species: { name: string } }>(`/pokemon/${id}`);
    species = await apiFetch<RawSpeciesVarieties>(
      `/pokemon-species/${p.species.name}`
    );
  }

  const settled = await Promise.allSettled(
    species.varieties.map(async (v) => {
      const detail = await getPokemonDetail(v.pokemon.name);
      const form: PokemonForm = {
        name: detail.name,
        label: getFormLabel(detail.name, v.is_default),
        isDefault: v.is_default,
        types: detail.types,
        sprite: detail.sprite,
        artwork: detail.artwork,
        stats: detail.stats,
        bst: detail.stats.reduce((sum, s) => sum + s.base, 0),
      };
      return form;
    })
  );

  return settled
    .filter((s): s is PromiseFulfilledResult<PokemonForm> => s.status === "fulfilled")
    .map((s) => s.value);
}
