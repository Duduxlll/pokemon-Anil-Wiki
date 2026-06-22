import { getEvolutionPath, getMoveDetails, getPokemonDetail } from "./pokeapi";
import { buildTypeChart, getCombinedDefenseProfile } from "./typeEffectiveness";
import { estimateStatsAtLevel } from "./statEstimate";
import { TYPE_LABELS_PT, TYPE_ORDER } from "./typeMeta";
import { getMoveLabelPt } from "./moveNames";
import { MoveDetail, PokemonDetail, PokemonTypeName } from "./types";

/* ------------------------------------------------------------------ */
/* Tipos de saída                                                      */
/* ------------------------------------------------------------------ */

export type Role =
  | "fisico"
  | "especial"
  | "tanque"
  | "rapido"
  | "suporte"
  | "equilibrado";

export const ROLE_LABEL: Record<Role, string> = {
  fisico: "Atacante físico",
  especial: "Atacante especial",
  tanque: "Tanque",
  rapido: "Rápido / finalizador",
  suporte: "Suporte / status",
  equilibrado: "Equilibrado",
};

export interface MonProfile {
  name: string;
  level: number;
  image: string;
  types: PokemonTypeName[];
  stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  bst: number;
  power: number;
  role: Role;
  weaknesses: PokemonTypeName[];
  resistances: PokemonTypeName[];
  immunities: PokemonTypeName[];
  offensiveCoverage: PokemonTypeName[];
  willEvolve: boolean;
  finalName: string;
  finalImage: string;
  finalBst: number;
  nextMinLevel: number | null;
}

export interface WildMoves {
  stab: { name: string; type: PokemonTypeName; power: number | null }[];
  coverage: { name: string; type: PokemonTypeName; power: number | null }[];
  status: { name: string; ailmentPt: string | null }[];
  upcoming: { name: string; level: number }[];
}

export interface SwapOption {
  outName: string;
  outImage: string;
  scoreAfter: number;
  delta: number;
}

export interface EncounterAnalysis {
  wild: MonProfile;
  wildMoves: WildMoves;
  team: MonProfile[];
  noTeam: boolean;
  synergy: {
    coversTeamWeakness: PokemonTypeName[];
    bringsNewType: PokemonTypeName[];
    repeatsType: PokemonTypeName[];
    addsCoverage: PokemonTypeName[];
    teamSharedWeaknesses: PokemonTypeName[];
  };
  bestSwap: {
    outName: string;
    outImage: string;
    scoreBefore: number;
    scoreAfter: number;
    delta: number;
    options: SwapOption[];
  } | null;
  scores: { now: number; future: number; fit: number };
  verdict: {
    decision: "vale" | "nao-vale" | "so-futuro";
    headline: string;
    mainReason: string;
    pros: string[];
    cons: string[];
    summary: string;
  };
}

interface TeamInput {
  name: string;
  level: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STAT_KEY: Record<string, keyof MonProfile["stats"]> = {
  HP: "hp",
  Ataque: "atk",
  Defesa: "def",
  "Ataque Especial": "spa",
  "Defesa Especial": "spd",
  Velocidade: "spe",
};

const AILMENT_PT: Record<string, string> = {
  sleep: "sono",
  paralysis: "paralisia",
  poison: "veneno",
  burn: "queimadura",
  freeze: "congelamento",
  confusion: "confusão",
  "leech-seed": "dreno de vida",
  trap: "prisão",
  infatuation: "encanto",
};

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

function labelTypes(types: PokemonTypeName[]) {
  return types.map((t) => TYPE_LABELS_PT[t]).join(", ");
}

function imageOf(d: PokemonDetail) {
  return d.artwork || d.sprite || "";
}

function bstOf(d: PokemonDetail) {
  return d.stats.reduce((sum, s) => sum + s.base, 0);
}

function statsOf(d: PokemonDetail): MonProfile["stats"] {
  const out = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const s of d.stats) {
    const key = STAT_KEY[s.name];
    if (key) out[key] = s.base;
  }
  return out;
}

function clamp10(x: number) {
  return Math.round(Math.max(0, Math.min(10, x)) * 10) / 10;
}

function roleFromStats(s: MonProfile["stats"], hasStatus: boolean): Role {
  const off = Math.max(s.atk, s.spa);
  const bulk = (s.hp + s.def + s.spd) / 3;
  const maxStat = Math.max(s.hp, s.atk, s.def, s.spa, s.spd, s.spe);
  if (hasStatus && off < 85 && bulk >= 65) return "suporte";
  if (s.spe === maxStat && off >= 80) return "rapido";
  if (bulk >= 95 && off <= 85) return "tanque";
  if (s.atk >= s.spa + 12) return "fisico";
  if (s.spa >= s.atk + 12) return "especial";
  return "equilibrado";
}

type Chart = Record<PokemonTypeName, Record<PokemonTypeName, number>>;

function offensiveCoverageOf(types: PokemonTypeName[], chart: Chart): PokemonTypeName[] {
  const set = new Set<PokemonTypeName>();
  for (const atk of types) {
    for (const def of TYPE_ORDER) {
      if (chart[atk][def] === 2) set.add(def);
    }
  }
  return [...set];
}

async function buildProfile(
  detail: PokemonDetail,
  level: number,
  chart: Chart,
  hasStatus: boolean
): Promise<MonProfile> {
  const path = await getEvolutionPath(detail.name);
  const finalStage = path.stages[path.stages.length - 1];
  const finalDetail =
    finalStage.name === detail.name ? detail : await getPokemonDetail(finalStage.name);
  const willEvolve = path.currentIndex < path.stages.length - 1;
  const nextStage = willEvolve ? path.stages[path.currentIndex + 1] : null;

  const profile = await getCombinedDefenseProfile(detail.types);
  const stats = statsOf(detail);

  return {
    name: detail.name,
    level,
    image: imageOf(detail),
    types: detail.types,
    stats,
    bst: bstOf(detail),
    power: estimateStatsAtLevel(detail.stats, level).total,
    role: roleFromStats(stats, hasStatus),
    weaknesses: profile.filter((e) => e.multiplier > 1).map((e) => e.type),
    resistances: profile.filter((e) => e.multiplier < 1 && e.multiplier > 0).map((e) => e.type),
    immunities: profile.filter((e) => e.multiplier === 0).map((e) => e.type),
    offensiveCoverage: offensiveCoverageOf(detail.types, chart),
    willEvolve,
    finalName: finalDetail.name,
    finalImage: imageOf(finalDetail),
    finalBst: bstOf(finalDetail),
    nextMinLevel: nextStage?.minLevel ?? null,
  };
}

function teamScore(members: MonProfile[]): number {
  if (members.length === 0) return 0;
  const cov = new Set<string>();
  members.forEach((m) => m.offensiveCoverage.forEach((t) => cov.add(t)));
  const coverageScore = cov.size / 18;

  let shared = 0;
  for (const atk of TYPE_ORDER) {
    const cnt = members.filter((m) => m.weaknesses.includes(atk)).length;
    if (cnt >= 2) shared += cnt - 1;
  }
  const defScore = 1 - Math.min(1, shared / (members.length * 1.4));

  const allT = new Set<string>();
  members.forEach((m) => m.types.forEach((t) => allT.add(t)));
  const diversityScore = Math.min(1, allT.size / (members.length * 1.6));

  const avgBst = members.reduce((s, m) => s + m.bst, 0) / members.length;
  const powerScore = Math.min(1, avgBst / 600);

  return (
    (coverageScore * 0.4 + defScore * 0.25 + diversityScore * 0.15 + powerScore * 0.2) * 100
  );
}

async function analyzeWildMoves(
  detail: PokemonDetail,
  level: number
): Promise<WildMoves> {
  const learned = detail.moves
    .filter((m) => m.levelLearnedAt <= level)
    .slice(-28);
  const upcoming = detail.moves
    .filter((m) => m.levelLearnedAt > level)
    .sort((a, b) => a.levelLearnedAt - b.levelLearnedAt)
    .slice(0, 4)
    .map((m) => ({ name: m.name, level: m.levelLearnedAt }));

  let details: MoveDetail[] = [];
  try {
    details = await getMoveDetails(learned.map((m) => m.name));
  } catch {
    details = [];
  }

  const byPower = (a: MoveDetail, b: MoveDetail) => (b.power ?? 0) - (a.power ?? 0);
  const stab = details
    .filter((m) => m.power != null && detail.types.includes(m.type))
    .sort(byPower)
    .slice(0, 4)
    .map((m) => ({ name: m.name, type: m.type, power: m.power }));
  const coverage = details
    .filter((m) => m.power != null && !detail.types.includes(m.type))
    .sort(byPower)
    .slice(0, 5)
    .map((m) => ({ name: m.name, type: m.type, power: m.power }));
  const status = details
    .filter((m) => m.damageClass === "status")
    .slice(0, 5)
    .map((m) => ({
      name: m.name,
      ailmentPt: m.ailment ? AILMENT_PT[m.ailment] ?? m.ailment : null,
    }));

  return { stab, coverage, status, upcoming };
}

/* ------------------------------------------------------------------ */
/* Análise principal                                                   */
/* ------------------------------------------------------------------ */

export async function analyzeEncounter(
  wildName: string,
  wildLevel: number,
  team: TeamInput[]
): Promise<EncounterAnalysis> {
  const chart = await buildTypeChart();
  const wildDetail = await getPokemonDetail(wildName);
  const wildMoves = await analyzeWildMoves(wildDetail, wildLevel);
  const hasStatus = wildMoves.status.length > 0;
  const wild = await buildProfile(wildDetail, wildLevel, chart, hasStatus);

  const settled = await Promise.allSettled(
    team.map(async (t) => {
      const detail = await getPokemonDetail(t.name);
      return buildProfile(detail, t.level, chart, false);
    })
  );
  const teamProfiles = settled
    .filter((s): s is PromiseFulfilledResult<MonProfile> => s.status === "fulfilled")
    .map((s) => s.value);

  const emptyVerdict = {
    decision: "nao-vale" as const,
    headline: "",
    mainReason: "",
    pros: [] as string[],
    cons: [] as string[],
    summary: "",
  };

  if (teamProfiles.length === 0) {
    return {
      wild,
      wildMoves,
      team: [],
      noTeam: true,
      synergy: {
        coversTeamWeakness: [],
        bringsNewType: [],
        repeatsType: [],
        addsCoverage: [],
        teamSharedWeaknesses: [],
      },
      bestSwap: null,
      scores: {
        now: clamp10((wild.bst / 600) * 10),
        future: clamp10((wild.finalBst / 600) * 10),
        fit: 0,
      },
      verdict: emptyVerdict,
    };
  }

  /* ---------- Sinergia ---------- */
  const teamSharedWeaknesses = TYPE_ORDER.filter(
    (atk) => teamProfiles.filter((m) => m.weaknesses.includes(atk)).length >= 2
  );
  const coversTeamWeakness = teamSharedWeaknesses.filter(
    (t) => wild.resistances.includes(t) || wild.immunities.includes(t)
  );
  const teamTypes = new Set(teamProfiles.flatMap((m) => m.types));
  const bringsNewType = wild.types.filter((t) => !teamTypes.has(t));
  const repeatsType = wild.types.filter(
    (t) => teamProfiles.filter((m) => m.types.includes(t)).length >= 2
  );
  const teamCov = new Set(teamProfiles.flatMap((m) => m.offensiveCoverage));
  const addsCoverage = wild.offensiveCoverage.filter((t) => !teamCov.has(t));

  /* ---------- Melhor troca ---------- */
  const scoreBefore = teamScore(teamProfiles);
  const options: SwapOption[] = teamProfiles.map((m, i) => {
    const replaced = [
      ...teamProfiles.slice(0, i),
      ...teamProfiles.slice(i + 1),
      wild,
    ];
    const after = teamScore(replaced);
    return {
      outName: m.name,
      outImage: m.image,
      scoreAfter: Math.round(after * 10) / 10,
      delta: Math.round((after - scoreBefore) * 10) / 10,
    };
  });
  const best = options.reduce((b, o) => (o.delta > b.delta ? o : b));
  const bestSwap = {
    outName: best.outName,
    outImage: best.outImage,
    scoreBefore: Math.round(scoreBefore * 10) / 10,
    scoreAfter: best.scoreAfter,
    delta: best.delta,
    options,
  };

  /* ---------- Notas ---------- */
  const now = clamp10((wild.bst / 600) * 10);
  const future = clamp10((wild.finalBst / 600) * 10);
  const fit = clamp10(5 + best.delta * 1.2);
  const scores = { now, future, fit };

  /* ---------- Veredito ---------- */
  const nowStrong = now >= 6;
  const futureStrong = future >= 7;
  const improvesTeam = best.delta > 0.8;

  let decision: "vale" | "nao-vale" | "so-futuro";
  if (improvesTeam && (nowStrong || futureStrong)) decision = "vale";
  else if (futureStrong && !nowStrong && best.delta > -1) decision = "so-futuro";
  else decision = "nao-vale";

  const pros: string[] = [];
  const cons: string[] = [];

  if (coversTeamWeakness.length)
    pros.push(`Tampa uma fraqueza do time: resiste a ${labelTypes(coversTeamWeakness)}.`);
  if (bringsNewType.length)
    pros.push(`Traz tipo novo pro time: ${labelTypes(bringsNewType)}.`);
  if (addsCoverage.length >= 2)
    pros.push(`Adiciona cobertura ofensiva contra ${labelTypes(addsCoverage.slice(0, 4))}.`);
  if (wild.role === "rapido")
    pros.push(`Bem rápido (Velocidade ${wild.stats.spe}) — ótimo pra finalizar inimigos.`);
  if (wild.role === "tanque")
    pros.push(`Aguenta bastante dano (bom tanque defensivo).`);
  if (futureStrong)
    pros.push(`Ótimo potencial: evolui até ${capitalize(wild.finalName)} (${wild.finalBst} de total base).`);
  if (wildMoves.status.length) {
    const ail = wildMoves.status.map((s) => s.ailmentPt).filter(Boolean);
    pros.push(
      `Tem golpes de status${ail.length ? ` (${[...new Set(ail)].join(", ")})` : ""} pra atrapalhar o oponente.`
    );
  }
  if (wildMoves.stab.length && (wildMoves.stab[0].power ?? 0) >= 80)
    pros.push(`Tem STAB forte: ${getMoveLabelPt(wildMoves.stab[0].name)} (${wildMoves.stab[0].power} de poder).`);

  if (repeatsType.length)
    cons.push(`Repete tipo que o time já tem bastante: ${labelTypes(repeatsType)}.`);
  if (!nowStrong)
    cons.push(`Ainda está fraco no nível atual (nota ${now}/10 agora).`);
  const sharesWeak = wild.weaknesses.filter((t) => teamSharedWeaknesses.includes(t));
  if (sharesWeak.length)
    cons.push(`Sofre das mesmas fraquezas do time: ${labelTypes(sharesWeak)}.`);
  if (!improvesTeam)
    cons.push(`Não melhora o equilíbrio geral do time na melhor troca possível.`);
  if (!bringsNewType.length && !coversTeamWeakness.length && !addsCoverage.length)
    cons.push(`Não acrescenta tipo, cobertura ou defesa que o time já não tenha.`);

  let mainReason: string;
  if (coversTeamWeakness.length)
    mainReason = `Cobre a fraqueza do time a ${labelTypes(coversTeamWeakness)}.`;
  else if (addsCoverage.length >= 3)
    mainReason = `Adiciona bastante cobertura ofensiva nova.`;
  else if (bringsNewType.length)
    mainReason = `Traz o tipo ${labelTypes(bringsNewType)}, que faltava no time.`;
  else if (improvesTeam)
    mainReason = `Aumenta o equilíbrio geral do time.`;
  else mainReason = `O time já cobre o que ele oferece.`;

  let headline: string;
  if (decision === "vale")
    headline = `Vale a pena! Melhor troca: tira ${capitalize(best.outName)} e coloca ${capitalize(wild.name)}.`;
  else if (decision === "so-futuro")
    headline = `Vale de olho no futuro — ${capitalize(wild.name)} cresce bastante evoluindo.`;
  else headline = `Não compensa trocar agora — seu time já está bem servido.`;

  const summary =
    decision === "vale"
      ? `${capitalize(wild.name)} encaixa bem: ${mainReason.toLowerCase()} Coloque no lugar do ${capitalize(best.outName)}.`
      : decision === "so-futuro"
      ? `Agora ${capitalize(wild.name)} ainda é fraco, mas evoluído vira ${capitalize(wild.finalName)} e fica forte. Vale guardar pra treinar.`
      : `${capitalize(wild.name)} não agrega muito ao seu time atual. ${mainReason}`;

  return {
    wild,
    wildMoves,
    team: teamProfiles,
    noTeam: false,
    synergy: {
      coversTeamWeakness,
      bringsNewType,
      repeatsType,
      addsCoverage,
      teamSharedWeaknesses,
    },
    bestSwap,
    scores,
    verdict: { decision, headline, mainReason, pros, cons, summary },
  };
}
