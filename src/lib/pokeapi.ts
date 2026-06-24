import { getAbilityLabelPt } from "./abilityNames";
import { getFormLabel } from "./formNames";
import { getLocationLabel } from "./locationNames";
import {
  EncounterByRegion,
  EvolutionPath,
  EvolutionStage,
  MapLocation,
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
    dexId: raw.id,
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
    dexId: detail.dexId,
    name: detail.name,
    types: detail.types,
    sprite: detail.sprite,
    spriteShiny: detail.spriteShiny,
    artwork: detail.artwork,
  };
}

// Formas regionais exibidas na Pokédex como entradas próprias.
const REGIONAL_FORM_TAGS = ["alola", "galar", "hisui", "paldea"];

function isRegionalForm(name: string): boolean {
  return REGIONAL_FORM_TAGS.some((t) => name.includes(`-${t}`));
}

function baseSpeciesName(name: string): string {
  for (const t of REGIONAL_FORM_TAGS) {
    const i = name.indexOf(`-${t}`);
    if (i >= 0) return name.slice(0, i);
  }
  return name;
}

let regionalFormNamesCache: string[] | null = null;
async function getRegionalFormNames(): Promise<string[]> {
  if (regionalFormNamesCache) return regionalFormNamesCache;
  try {
    const data = await apiFetch<{ results: { name: string }[] }>(
      `/pokemon?limit=100000`
    );
    regionalFormNamesCache = data.results
      .map((r) => r.name)
      .filter(isRegionalForm);
  } catch {
    regionalFormNamesCache = [];
  }
  return regionalFormNamesCache;
}

let searchableNamesCache: PokemonListItem[] | null = null;
export async function getSearchableNameList(): Promise<PokemonListItem[]> {
  if (searchableNamesCache) return searchableNamesCache;
  const base = await getPokemonNameList();
  const formNames = await getRegionalFormNames();
  const forms = formNames.map((name, i) => ({ id: 100000 + i, name }));
  searchableNamesCache = [...base, ...forms];
  return searchableNamesCache;
}

let summariesCache: PokemonSummary[] | null = null;
let summariesPromise: Promise<PokemonSummary[]> | null = null;

async function fetchSummariesInBatches(
  identifiers: (string | number)[]
): Promise<PokemonDetail[]> {
  const out: PokemonDetail[] = [];
  for (let i = 0; i < identifiers.length; i += SUMMARY_FETCH_CONCURRENCY) {
    const batch = identifiers.slice(i, i + SUMMARY_FETCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) => getPokemonDetail(id))
    );
    for (const result of results) {
      if (result.status === "fulfilled") out.push(result.value);
    }
  }
  return out;
}

async function buildSummaries(): Promise<PokemonSummary[]> {
  const nameList = await getPokemonNameList();
  const nameToId = new Map(nameList.map((n) => [n.name, n.id]));

  const ids = Array.from({ length: TOTAL_POKEMON_COUNT }, (_, i) => i + 1);
  const formNames = await getRegionalFormNames();

  const [defaults, forms] = await Promise.all([
    fetchSummariesInBatches(ids),
    fetchSummariesInBatches(formNames),
  ]);

  const summaries: PokemonSummary[] = defaults.map(toSummary);
  for (const detail of forms) {
    const summary = toSummary(detail);
    summary.dexId = nameToId.get(baseSpeciesName(detail.name)) ?? detail.dexId;
    summaries.push(summary);
  }

  return summaries.sort((a, b) => a.dexId - b.dexId || a.id - b.id);
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

const KANTO_VERSIONS = new Set([
  "red",
  "blue",
  "yellow",
  "firered",
  "leafgreen",
]);

interface RawEncounter {
  location_area: { name: string };
  version_details: { version: { name: string } }[];
}

let kantoMapCache: MapLocation[] | null = null;

// Agrega os encontros dos 151 Pokémon de Kanto por local (base: jogos de Kanto
// da PokéAPI, que o Pokémon Anil recria).
export async function getKantoEncounterMap(): Promise<MapLocation[]> {
  if (kantoMapCache) return kantoMapCache;

  const nameList = await getPokemonNameList();
  const idToName = new Map(nameList.map((n) => [n.id, n.name]));
  const ids = Array.from({ length: 151 }, (_, i) => i + 1);
  const areaToIds = new Map<string, Set<number>>();

  for (let i = 0; i < ids.length; i += SUMMARY_FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + SUMMARY_FETCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (id) => ({
        id,
        encounters: await apiFetch<RawEncounter[]>(`/pokemon/${id}/encounters`),
      }))
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const enc of r.value.encounters) {
        const inKanto = enc.version_details.some((v) =>
          KANTO_VERSIONS.has(v.version.name)
        );
        if (!inKanto) continue;
        const area = enc.location_area.name;
        if (!areaToIds.has(area)) areaToIds.set(area, new Set());
        areaToIds.get(area)!.add(r.value.id);
      }
    }
  }

  kantoMapCache = [...areaToIds.entries()]
    .map(([area, idSet]) => ({
      area,
      label: getLocationLabel(area),
      pokemon: [...idSet]
        .sort((a, b) => a - b)
        .map((id) => ({ name: idToName.get(id) ?? String(id), dexId: id })),
    }))
    .filter((l) => l.pokemon.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt"));

  return kantoMapCache;
}

const VERSION_REGION: Record<string, string> = {
  red: "Kanto", blue: "Kanto", yellow: "Kanto", firered: "Kanto", leafgreen: "Kanto",
  "lets-go-pikachu": "Kanto", "lets-go-eevee": "Kanto",
  gold: "Johto", silver: "Johto", crystal: "Johto", heartgold: "Johto", soulsilver: "Johto",
  ruby: "Hoenn", sapphire: "Hoenn", emerald: "Hoenn", "omega-ruby": "Hoenn", "alpha-sapphire": "Hoenn",
  diamond: "Sinnoh", pearl: "Sinnoh", platinum: "Sinnoh", "brilliant-diamond": "Sinnoh", "shining-pearl": "Sinnoh",
  black: "Unova", white: "Unova", "black-2": "Unova", "white-2": "Unova",
  x: "Kalos", y: "Kalos",
  sun: "Alola", moon: "Alola", "ultra-sun": "Alola", "ultra-moon": "Alola",
  "legends-arceus": "Hisui",
  sword: "Galar", shield: "Galar",
  scarlet: "Paldea", violet: "Paldea",
};

const REGION_ORDER = [
  "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Hisui", "Galar", "Paldea",
];

// Busca sob demanda: onde encontrar QUALQUER Pokémon (todas as gerações),
// agrupado pela região do jogo.
export async function getPokemonEncounters(
  name: string
): Promise<EncounterByRegion[]> {
  const id = resolvePokemonName(name);
  const encounters = await apiFetch<RawEncounter[]>(`/pokemon/${id}/encounters`);

  const byRegion = new Map<string, Set<string>>();
  for (const e of encounters) {
    const regions = new Set<string>();
    for (const v of e.version_details) {
      const r = VERSION_REGION[v.version.name];
      if (r) regions.add(r);
    }
    if (regions.size === 0) continue;
    const label = getLocationLabel(e.location_area.name);
    for (const r of regions) {
      if (!byRegion.has(r)) byRegion.set(r, new Set());
      byRegion.get(r)!.add(label);
    }
  }

  return REGION_ORDER.filter((r) => byRegion.has(r)).map((r) => ({
    region: r,
    locais: [...byRegion.get(r)!],
  }));
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
