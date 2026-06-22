import { getEvolutionPath, getMoveDetails, getPokemonDetail } from "./pokeapi";
import { buildTypeChart } from "./typeEffectiveness";
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
  evolutionStage: number;
  evolutionStageCount: number;
  evolutionBoost: number;
  nextName: string | null;
  nextImage: string;
  nextBst: number | null;
  nextPower: number | null;
  finalName: string;
  finalImage: string;
  finalBst: number;
  finalTypes: PokemonTypeName[];
  finalStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  finalPower: number;
  finalRole: Role;
  finalWeaknesses: PokemonTypeName[];
  finalResistances: PokemonTypeName[];
  finalImmunities: PokemonTypeName[];
  finalOffensiveCoverage: PokemonTypeName[];
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
  individualDelta: number;
  minDeltaRequired: number;
  recommended: boolean;
  confidence: "alta" | "media" | "baixa";
  reasons: string[];
  warnings: string[];
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
    individualDelta: number;
    minDeltaRequired: number;
    recommended: boolean;
    confidence: "alta" | "media" | "baixa";
    reasons: string[];
    warnings: string[];
    options: SwapOption[];
  } | null;
  teamSpace: {
    hasOpenSlot: boolean;
    scoreAfter: number;
    delta: number;
  } | null;
  detailedReport: {
    headline: string;
    recommendation: string;
    shortRecommendation: string;
    keyPoints: string[];
    scoreExplanation: string;
    sections: {
      title: string;
      tone: "good" | "warn" | "neutral";
      points: string[];
    }[];
    alternatives: string[];
  };
  scores: { now: number; future: number; fit: number };
  verdict: {
    decision: "vale" | "nao-vale" | "so-futuro";
    action: "adicionar" | "trocar" | "guardar" | "ignorar";
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

const FULL_TEAM_SIZE = 6;

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

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function clamp10(x: number) {
  return round1(Math.max(0, Math.min(10, x)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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

function defenseProfileOf(types: PokemonTypeName[], chart: Chart) {
  return TYPE_ORDER.map((attacker) => {
    const multiplier = types.reduce((acc, defender) => acc * chart[attacker][defender], 1);
    return { type: attacker, multiplier };
  }).sort((a, b) => b.multiplier - a.multiplier);
}

async function buildProfile(
  detail: PokemonDetail,
  level: number,
  chart: Chart,
  hasStatus: boolean
): Promise<MonProfile> {
  const path = await getEvolutionPath(detail.speciesName);
  const finalStage = path.stages[path.stages.length - 1];
  const finalDetail =
    finalStage.name === detail.name ? detail : await getPokemonDetail(finalStage.name);
  const willEvolve = path.currentIndex < path.stages.length - 1;
  const nextStage = willEvolve ? path.stages[path.currentIndex + 1] : null;
  const nextDetail = nextStage
    ? nextStage.name === detail.name
      ? detail
      : nextStage.name === finalDetail.name
      ? finalDetail
      : await getPokemonDetail(nextStage.name)
    : null;

  const profile = defenseProfileOf(detail.types, chart);
  const finalProfile = defenseProfileOf(finalDetail.types, chart);
  const stats = statsOf(detail);
  const finalStats = statsOf(finalDetail);
  const bst = bstOf(detail);
  const finalBst = bstOf(finalDetail);
  const nextBst = nextDetail ? bstOf(nextDetail) : null;

  return {
    name: detail.name,
    level,
    image: imageOf(detail),
    types: detail.types,
    stats,
    bst,
    power: estimateStatsAtLevel(detail.stats, level).total,
    role: roleFromStats(stats, hasStatus),
    weaknesses: profile.filter((e) => e.multiplier > 1).map((e) => e.type),
    resistances: profile.filter((e) => e.multiplier < 1 && e.multiplier > 0).map((e) => e.type),
    immunities: profile.filter((e) => e.multiplier === 0).map((e) => e.type),
    offensiveCoverage: offensiveCoverageOf(detail.types, chart),
    willEvolve,
    evolutionStage: path.currentIndex + 1,
    evolutionStageCount: path.stages.length,
    evolutionBoost: finalBst - bst,
    nextName: nextDetail?.name ?? null,
    nextImage: nextDetail ? imageOf(nextDetail) : "",
    nextBst,
    nextPower: nextDetail ? estimateStatsAtLevel(nextDetail.stats, level).total : null,
    finalName: finalDetail.name,
    finalImage: imageOf(finalDetail),
    finalBst,
    finalTypes: finalDetail.types,
    finalStats,
    finalPower: estimateStatsAtLevel(finalDetail.stats, level).total,
    finalRole: roleFromStats(finalStats, hasStatus),
    finalWeaknesses: finalProfile.filter((e) => e.multiplier > 1).map((e) => e.type),
    finalResistances: finalProfile.filter((e) => e.multiplier < 1 && e.multiplier > 0).map((e) => e.type),
    finalImmunities: finalProfile.filter((e) => e.multiplier === 0).map((e) => e.type),
    finalOffensiveCoverage: offensiveCoverageOf(finalDetail.types, chart),
    nextMinLevel: nextStage?.minLevel ?? null,
  };
}

function currentValue01(m: MonProfile): number {
  const base = clamp01(m.bst / 600);
  const currentPower = clamp01(m.power / 620);
  const levelReadiness = clamp01((m.level - 1) / 69);
  const stableStage = m.willEvolve ? 0 : 0.04;

  return clamp01(base * 0.48 + currentPower * 0.34 + levelReadiness * 0.14 + stableStage);
}

function futureValue01(m: MonProfile): number {
  const currentBase = clamp01(m.bst / 600);
  const finalBase = clamp01(m.finalBst / 620);
  const finalPower = clamp01(m.finalPower / 650);
  const growth = clamp01((m.finalBst - m.bst) / 220);

  return clamp01(finalBase * 0.62 + finalPower * 0.18 + currentBase * 0.12 + growth * 0.08);
}

function evolutionUpside01(m: MonProfile): number {
  if (!m.willEvolve) return 0;
  const statGrowth = clamp01(m.evolutionBoost / 230);
  const defensiveGrowth = Math.max(0, memberFinalDefenseValue01(m) - memberDefenseValue01(m));
  const coverageGrowth = Math.max(0, memberFinalCoverageValue01(m) - memberCoverageValue01(m));

  return clamp01(statGrowth * 0.65 + defensiveGrowth * 0.22 + coverageGrowth * 0.13);
}

function evolutionReadiness01(m: MonProfile): number {
  if (!m.willEvolve) return 0;
  if (m.nextMinLevel == null) return 0.48;
  if (m.level >= m.nextMinLevel) return 1;
  return clamp01(1 - (m.nextMinLevel - m.level) / 24);
}

function pokemonNowScore(m: MonProfile): number {
  return clamp10(currentValue01(m) * 10);
}

function pokemonFutureScore(m: MonProfile): number {
  return clamp10(linePotential01(m) * 10);
}

function profileDefenseValue01(
  resistances: PokemonTypeName[],
  immunities: PokemonTypeName[],
  weaknesses: PokemonTypeName[]
): number {
  const resistValue = clamp01((resistances.length + immunities.length * 1.35) / 8);
  const weaknessPenalty =
    Math.min(0.45, weaknesses.length * 0.055 + (weaknesses.length >= 5 ? 0.1 : 0));

  return clamp01(0.5 + resistValue * 0.42 - weaknessPenalty);
}

function memberDefenseValue01(m: MonProfile): number {
  return profileDefenseValue01(m.resistances, m.immunities, m.weaknesses);
}

function memberFinalDefenseValue01(m: MonProfile): number {
  return profileDefenseValue01(m.finalResistances, m.finalImmunities, m.finalWeaknesses);
}

function memberCoverageValue01(m: MonProfile): number {
  return clamp01(m.offensiveCoverage.length / 7);
}

function memberFinalCoverageValue01(m: MonProfile): number {
  return clamp01(m.finalOffensiveCoverage.length / 7);
}

function linePotential01(m: MonProfile): number {
  return clamp01(
    futureValue01(m) * 0.5 +
      memberFinalDefenseValue01(m) * 0.24 +
      memberFinalCoverageValue01(m) * 0.14 +
      evolutionUpside01(m) * 0.08 +
      evolutionReadiness01(m) * 0.04
  );
}

function memberScore(m: MonProfile): number {
  const stageStability = m.willEvolve ? 3 + evolutionReadiness01(m) * 2 : 5;
  return (
    currentValue01(m) * 30 +
    linePotential01(m) * 42 +
    memberDefenseValue01(m) * 10 +
    memberFinalDefenseValue01(m) * 8 +
    memberCoverageValue01(m) * 4 +
    memberFinalCoverageValue01(m) * 3 +
    stageStability
  );
}

function teamCoverageScore(members: MonProfile[], future = false): number {
  const coverage = new Set<PokemonTypeName>();

  for (const m of members) {
    const source = future ? m.finalOffensiveCoverage : m.offensiveCoverage;
    source.forEach((t) => coverage.add(t));
  }

  return clamp01(coverage.size / TYPE_ORDER.length);
}

function teamDefenseScore(members: MonProfile[], future = false): number {
  if (!members.length) return 0;

  let sharedWeakness = 0;
  let uncoveredCritical = 0;
  let protectedTypes = 0;

  for (const atk of TYPE_ORDER) {
    const weakCount = members.filter((m) =>
      (future ? m.finalWeaknesses : m.weaknesses).includes(atk)
    ).length;
    const protectedCount = members.filter(
      (m) =>
        (future ? m.finalResistances : m.resistances).includes(atk) ||
        (future ? m.finalImmunities : m.immunities).includes(atk)
    ).length;

    if (protectedCount > 0) protectedTypes += 1;
    if (weakCount >= 2) sharedWeakness += weakCount - 1;
    if (weakCount >= 3 && protectedCount === 0) uncoveredCritical += weakCount - 2;
  }

  const sharedScore = 1 - Math.min(1, sharedWeakness / (members.length * 1.4));
  const protectionScore = protectedTypes / TYPE_ORDER.length;
  const criticalPenalty = Math.min(0.25, uncoveredCritical * 0.08);

  return clamp01(sharedScore * 0.68 + protectionScore * 0.32 - criticalPenalty);
}

function teamDiversityScore(members: MonProfile[], future = false): number {
  if (!members.length) return 0;
  const types = new Set<PokemonTypeName>();
  members.forEach((m) => (future ? m.finalTypes : m.types).forEach((t) => types.add(t)));
  return clamp01(types.size / Math.min(12, members.length * 1.6));
}

function teamRoleScore(members: MonProfile[], future = false): number {
  if (!members.length) return 0;

  const counts = new Map<Role, number>();
  members.forEach((m) => {
    const role = future ? m.finalRole : m.role;
    counts.set(role, (counts.get(role) ?? 0) + 1);
  });

  const variety = clamp01(counts.size / 4.5);
  const duplicatePenalty = [...counts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 2) * 0.12,
    0
  );

  return clamp01(variety - duplicatePenalty);
}

function teamScore(members: MonProfile[]): number {
  if (members.length === 0) return 0;

  const current = average(members.map(currentValue01));
  const future = average(members.map(linePotential01));
  const defenseNow = teamDefenseScore(members);
  const defenseFuture = teamDefenseScore(members, true);
  const coverageNow = teamCoverageScore(members);
  const coverageFuture = teamCoverageScore(members, true);
  const roles = (teamRoleScore(members) + teamRoleScore(members, true)) / 2;
  const diversity = (teamDiversityScore(members) + teamDiversityScore(members, true)) / 2;

  return (
    current * 0.22 +
    future * 0.28 +
    defenseNow * 0.12 +
    defenseFuture * 0.17 +
    coverageNow * 0.08 +
    coverageFuture * 0.07 +
    roles * 0.04 +
    diversity * 0.02
  ) * 100;
}

function uniqueTypesLost(out: MonProfile, remaining: MonProfile[]): PokemonTypeName[] {
  return out.types.filter((type) => !remaining.some((m) => m.types.includes(type)));
}

function requiredDeltaForSwap(out: MonProfile, wild: MonProfile, remaining: MonProfile[]): number {
  let required = 2.4;
  const outLine = linePotential01(out);
  const wildLine = linePotential01(wild);

  if (out.willEvolve) required += 1.4;
  if (out.willEvolve && out.evolutionBoost >= 80) required += 0.7;
  if (out.willEvolve && evolutionReadiness01(out) >= 0.45) required += 0.5;
  if (out.willEvolve && !wild.willEvolve && outLine >= wildLine - 0.03) required += 1.1;
  if (!out.willEvolve && out.finalBst >= 500) required += 1.1;
  if (out.finalBst >= wild.finalBst + 40) required += 0.9;
  if (outLine >= wildLine + 0.08) required += 1.2;
  if (memberFinalDefenseValue01(out) >= memberFinalDefenseValue01(wild) + 0.18) required += 0.8;
  if (out.power > wild.power * 1.12) required += 1;
  if (out.level >= wild.level + 8) required += 0.8;
  required += Math.min(1.2, uniqueTypesLost(out, remaining).length * 0.45);

  return round1(Math.max(1.8, required));
}

function confidenceForSwap(delta: number, required: number, individualDelta: number) {
  const margin = delta - required;
  if (margin >= 2.5 && individualDelta >= 3) return "alta" as const;
  if (margin >= 0 && individualDelta >= -1) return "media" as const;
  return "baixa" as const;
}

function buildSwapNotes(
  out: MonProfile,
  wild: MonProfile,
  remaining: MonProfile[],
  delta: number,
  required: number,
  individualDelta: number,
  recommended: boolean
) {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const lostTypes = uniqueTypesLost(out, remaining);
  const outLine = linePotential01(out);
  const wildLine = linePotential01(wild);

  if (delta > 0) reasons.push(`Melhora o placar geral do time em ${round1(delta)} ponto(s).`);
  if (wild.power >= out.power * 1.08)
    reasons.push(`Está mais pronto no nível atual (${wild.power} contra ${out.power} de poder estimado).`);
  if (wild.finalBst >= out.finalBst + 35)
    reasons.push(`Tem teto evolutivo maior (${wild.finalBst} contra ${out.finalBst} de total base final).`);
  if (wild.willEvolve && wildLine >= outLine + 0.06)
    reasons.push(`A linha evolutiva até ${capitalize(wild.finalName)} promete mais que a de ${capitalize(out.name)}.`);
  if (memberDefenseValue01(wild) >= memberDefenseValue01(out) + 0.12)
    reasons.push(`Traz um perfil defensivo mais útil para a equipe.`);
  if (memberCoverageValue01(wild) >= memberCoverageValue01(out) + 0.14)
    reasons.push(`Aumenta a cobertura ofensiva disponível.`);

  if (delta < required)
    warnings.push(`O ganho é pequeno: precisaria de pelo menos +${required} para justificar essa troca.`);
  if (out.willEvolve)
    warnings.push(
      `${capitalize(out.name)} ainda evolui para ${capitalize(out.finalName)}; essa forma final entra na comparação.`
    );
  if (outLine >= wildLine + 0.04)
    warnings.push(
      out.willEvolve
        ? `A linha evolutiva de ${capitalize(out.name)} encaixa melhor no longo prazo que ${capitalize(wild.name)}.`
        : `O perfil de longo prazo de ${capitalize(out.name)} encaixa melhor que ${capitalize(wild.name)}.`
    );
  if (individualDelta < -1)
    warnings.push(`Individualmente, ${capitalize(out.name)} ainda entrega mais que ${capitalize(wild.name)}.`);
  if (wild.power < out.power * 0.9)
    warnings.push(`No nível atual, ${capitalize(wild.name)} está abaixo em poder estimado (${wild.power} contra ${out.power}).`);
  if (!out.willEvolve && out.finalBst >= 500)
    warnings.push(`${capitalize(out.name)} já é um membro forte e em estágio final; só vale tirar com ganho claro.`);
  if (lostTypes.length)
    warnings.push(`Tirar ${capitalize(out.name)} remove tipo único do time: ${labelTypes(lostTypes)}.`);
  if (!recommended && delta > 0 && warnings.length === 0)
    warnings.push(`Há ganho matemático, mas a margem ainda não é segura para mexer na equipe principal.`);

  return { reasons, warnings };
}

function lostCoverage(out: MonProfile, remaining: MonProfile[], wild: MonProfile): PokemonTypeName[] {
  const afterCoverage = new Set([
    ...remaining.flatMap((m) => m.offensiveCoverage),
    ...wild.offensiveCoverage,
  ]);

  return out.offensiveCoverage.filter((type) => !afterCoverage.has(type));
}

function weaknessCounts(members: MonProfile[]) {
  return Object.fromEntries(
    TYPE_ORDER.map((type) => [type, members.filter((m) => m.weaknesses.includes(type)).length])
  ) as Record<PokemonTypeName, number>;
}

function protectedCounts(members: MonProfile[]) {
  return Object.fromEntries(
    TYPE_ORDER.map((type) => [
      type,
      members.filter((m) => m.resistances.includes(type) || m.immunities.includes(type)).length,
    ])
  ) as Record<PokemonTypeName, number>;
}

function worsenedWeaknesses(before: MonProfile[], after: MonProfile[]) {
  const beforeWeak = weaknessCounts(before);
  const afterWeak = weaknessCounts(after);
  const afterProtected = protectedCounts(after);

  return TYPE_ORDER.filter(
    (type) =>
      afterWeak[type] > beforeWeak[type] &&
      (afterWeak[type] >= 2 || afterProtected[type] === 0)
  );
}

function improvedWeaknesses(before: MonProfile[], after: MonProfile[]) {
  const beforeWeak = weaknessCounts(before);
  const afterWeak = weaknessCounts(after);

  return TYPE_ORDER.filter((type) => beforeWeak[type] >= 2 && afterWeak[type] < beforeWeak[type]);
}

function roleLabel(role: Role) {
  return ROLE_LABEL[role].toLowerCase();
}

function compareNumber(label: string, wildValue: number, outValue: number, wildName: string, outName: string) {
  const diff = wildValue - outValue;
  if (Math.abs(diff) < 4) {
    return `${label}: ${capitalize(wildName)} e ${capitalize(outName)} ficam bem próximos (${wildValue} contra ${outValue}).`;
  }

  const better = diff > 0 ? wildName : outName;
  return `${label}: vantagem de ${Math.abs(diff)} para ${capitalize(better)} (${wildValue} contra ${outValue}).`;
}

function withoutFinalPeriod(text: string) {
  return text.replace(/[.!?]+$/g, "");
}

function buildDetailedReport({
  action,
  wild,
  teamProfiles,
  bestOut,
  best,
  options,
  teamSpace,
  coversTeamWeakness,
  bringsNewType,
  repeatsType,
  addsCoverage,
}: {
  action: "adicionar" | "trocar" | "guardar" | "ignorar";
  wild: MonProfile;
  teamProfiles: MonProfile[];
  bestOut: MonProfile;
  best: SwapOption;
  options: SwapOption[];
  teamSpace: { hasOpenSlot: boolean; scoreAfter: number; delta: number };
  coversTeamWeakness: PokemonTypeName[];
  bringsNewType: PokemonTypeName[];
  repeatsType: PokemonTypeName[];
  addsCoverage: PokemonTypeName[];
}): EncounterAnalysis["detailedReport"] {
  const remaining = teamProfiles.filter((m) => m.name !== bestOut.name);
  const after = [...remaining, wild];
  const lostTypes = uniqueTypesLost(bestOut, remaining);
  const lostCov = lostCoverage(bestOut, remaining, wild);
  const opened = worsenedWeaknesses(teamProfiles, after);
  const improved = improvedWeaknesses(teamProfiles, after);
  const wildLine = `${capitalize(wild.name)}${wild.willEvolve ? ` -> ${capitalize(wild.finalName)}` : ""}`;
  const outLine = `${capitalize(bestOut.name)}${bestOut.willEvolve ? ` -> ${capitalize(bestOut.finalName)}` : ""}`;
  const futureGap = linePotential01(wild) - linePotential01(bestOut);
  const wildFutureLabel = wild.willEvolve
    ? `${capitalize(wild.name)} vira ${capitalize(wild.finalName)}`
    : `${capitalize(wild.name)} tem bom longo prazo`;
  const outFutureLabel = bestOut.willEvolve
    ? `${capitalize(bestOut.name)} ainda vira ${capitalize(bestOut.finalName)}`
    : `${capitalize(bestOut.name)} tem melhor longo prazo`;

  const nowPoints = [
    compareNumber("Poder no nível atual", wild.power, bestOut.power, wild.name, bestOut.name),
    compareNumber("Total base atual", wild.bst, bestOut.bst, wild.name, bestOut.name),
    `${capitalize(wild.name)} atua como ${roleLabel(wild.role)}; ${capitalize(bestOut.name)} atua como ${roleLabel(bestOut.role)}.`,
  ];

  if (wild.power > bestOut.power + 20) {
    nowPoints.push(`${capitalize(wild.name)} ajuda mais no curto prazo, porque já chega mais forte no nível informado.`);
  } else if (bestOut.power > wild.power + 20) {
    nowPoints.push(`${capitalize(bestOut.name)} ainda entrega mais agora; trocar seria pagar um preço no presente.`);
  } else {
    nowPoints.push(`No presente, nenhum dos dois abre uma diferença enorme sozinho; o encaixe do time pesa mais.`);
  }

  const futurePoints = [
    `${wildLine}: forma final com ${wild.finalBst} de total base${wild.willEvolve ? `, ganho de +${wild.evolutionBoost}` : ""}.`,
    `${outLine}: forma final com ${bestOut.finalBst} de total base${bestOut.willEvolve ? `, ganho de +${bestOut.evolutionBoost}` : ""}.`,
  ];

  if (bestOut.willEvolve) {
    futurePoints.push(
      `${capitalize(bestOut.name)} ainda tem evolução pendente, então ele não está sendo julgado só pelo estado atual.`
    );
  }
  if (wild.willEvolve) {
    futurePoints.push(
      `${capitalize(wild.name)} também tem futuro na linha evolutiva, então vale considerar treinar antes de decidir.`
    );
  }
  if (linePotential01(wild) > linePotential01(bestOut) + 0.06) {
    futurePoints.push(`Pensando no longo prazo, a linha de ${capitalize(wild.name)} parece mais promissora.`);
  } else if (linePotential01(bestOut) > linePotential01(wild) + 0.06) {
    futurePoints.push(`Pensando no longo prazo, a linha de ${capitalize(bestOut.name)} parece mais segura para manter.`);
  } else {
    futurePoints.push(`No longo prazo, as duas linhas ficam próximas; aí tipos e função no time decidem.`);
  }

  const nowPerspective =
    wild.power > bestOut.power + 20
      ? `Agora: ${capitalize(wild.name)} entrega mais no nível atual.`
      : bestOut.power > wild.power + 20
      ? `Agora: ${capitalize(bestOut.name)} ainda entrega mais no nível atual.`
      : `Agora: ${capitalize(wild.name)} e ${capitalize(bestOut.name)} ficam próximos; o encaixe decide.`;

  const balancedPerspective =
    action === "trocar"
      ? `Equilíbrio: a troca passa a margem segura.`
      : action === "adicionar"
      ? `Equilíbrio: adicionar é bom porque não sacrifica ninguém.`
      : best.delta > 0
      ? `Equilíbrio: +${best.delta} é pouco para tirar alguém com segurança.`
      : `Equilíbrio: manter o time atual é a escolha mais justa.`;

  const futurePerspective =
    futureGap > 0.06
      ? `Futuro: ${wildFutureLabel}, então vale guardar ou treinar.`
      : futureGap < -0.06
      ? `Futuro: ${outFutureLabel}.`
      : `Futuro: as linhas ficam parecidas; tipos e função decidem.`;

  const perspectivePoints = [nowPerspective, balancedPerspective, futurePerspective];

  const typePoints: string[] = [];
  if (bringsNewType.length) typePoints.push(`Traz tipo novo: ${labelTypes(bringsNewType)}.`);
  if (lostTypes.length) typePoints.push(`Tirar ${capitalize(bestOut.name)} remove tipo único: ${labelTypes(lostTypes)}.`);
  if (repeatsType.length) typePoints.push(`Repete tipo que seu time já tem bastante: ${labelTypes(repeatsType)}.`);
  if (coversTeamWeakness.length)
    typePoints.push(`Ajuda defensivamente porque resiste ou é imune a fraquezas repetidas: ${labelTypes(coversTeamWeakness)}.`);
  if (addsCoverage.length)
    typePoints.push(`Ganha cobertura ofensiva nova contra: ${labelTypes(addsCoverage.slice(0, 5))}.`);
  if (lostCov.length)
    typePoints.push(`Mas perde cobertura ofensiva que só ${capitalize(bestOut.name)} dava: ${labelTypes(lostCov.slice(0, 5))}.`);
  if (!typePoints.length) {
    typePoints.push(`Nos tipos e cobertura, ${capitalize(wild.name)} não muda muito o que a equipe já faz.`);
  }

  const gapPoints: string[] = [];
  if (improved.length) gapPoints.push(`Reduz fraquezas repetidas contra: ${labelTypes(improved)}.`);
  if (opened.length) gapPoints.push(`Pode abrir ou piorar brechas contra: ${labelTypes(opened)}.`);
  const sharedWeak = wild.weaknesses.filter((type) =>
    teamProfiles.filter((m) => m.weaknesses.includes(type)).length >= 2
  );
  if (sharedWeak.length)
    gapPoints.push(`${capitalize(wild.name)} entra sofrendo junto com o time contra: ${labelTypes(sharedWeak)}.`);
  if (!gapPoints.length) {
    gapPoints.push(`Não abre uma brecha defensiva grave, mas também não corrige um problema grande sozinho.`);
  }

  const optionPoints = [...options]
    .sort((a, b) => b.delta - a.delta)
    .map((option) => {
      const member = teamProfiles.find((m) => m.name === option.outName);
      const verdict = option.recommended ? "recomendado" : "não recomendado";
      const evolutionNote = member?.willEvolve
        ? `; ${capitalize(member.name)} ainda evolui para ${capitalize(member.finalName)}`
        : "";
      const warning = option.warnings.find((w) => w.includes("linha evolutiva")) ?? option.warnings[0];
      const warningNote = warning ? `; ${withoutFinalPeriod(warning)}` : "";

      return `${capitalize(option.outName)}: ${verdict}, ganho ${option.delta >= 0 ? "+" : ""}${option.delta} / margem +${option.minDeltaRequired}${evolutionNote}${warningNote}.`;
    });

  const bestReason =
    action === "trocar"
      ? `A troca é segura: +${best.delta} no time contra +${best.minDeltaRequired} exigido.`
      : action === "adicionar"
      ? `Existe vaga livre, então dá para adicionar sem sacrificar ninguém.`
      : best.delta > 0
      ? `O ganho existe (+${best.delta}), mas fica abaixo da margem segura (+${best.minDeltaRequired}).`
      : `A melhor simulação não melhora o time o suficiente para mexer.`;

  const recommendation =
    action === "trocar"
      ? `Faça a troca: ${capitalize(wild.name)} melhora o time no lugar de ${capitalize(bestOut.name)}.`
      : action === "adicionar"
      ? `Adicione agora; como há vaga livre, você decide troca depois.`
      : action === "guardar"
      ? `Guarde ou treine, mas não tire ninguém da equipe principal ainda.`
      : `Mantenha a equipe atual; capture só por preferência ou coleção.`;

  const shortRecommendation =
    action === "trocar"
      ? `Melhor opção: trocar ${capitalize(bestOut.name)} por ${capitalize(wild.name)}.`
      : action === "adicionar"
      ? `Melhor opção: adicionar ${capitalize(wild.name)} sem tirar ninguém.`
      : action === "guardar"
      ? `Melhor opção: guardar ${capitalize(wild.name)} e manter a equipe por enquanto.`
      : `Melhor opção: manter sua equipe atual.`;

  const scoreExplanation =
    action === "adicionar"
      ? `Placar: vaga livre, sem custo de troca; adicionar renderia ${teamSpace.delta >= 0 ? "+" : ""}${teamSpace.delta}.`
      : action === "trocar"
      ? `Placar: +${best.delta} passa a margem +${best.minDeltaRequired}; por isso a troca é segura.`
      : best.delta > 0
      ? `Placar: +${best.delta} fica abaixo da margem +${best.minDeltaRequired}; melhora pouco, então não vale tirar alguém.`
      : `Placar: ${best.delta}; a melhor troca piora ou quase não melhora o time.`;

  const futureSummary =
    futureGap > 0.06
      ? `Futuro: ${wildFutureLabel}.`
      : futureGap < -0.06
      ? `Futuro: ${outFutureLabel}.`
      : `Futuro: as duas linhas são parecidas; tipos e função decidem.`;

  const typeSummary =
    opened.length
      ? `Time: pode abrir brecha contra ${labelTypes(opened.slice(0, 3))}.`
      : lostTypes.length
      ? `Time: você perderia tipo único (${labelTypes(lostTypes)}).`
      : coversTeamWeakness.length
      ? `Time: cobre fraqueza contra ${labelTypes(coversTeamWeakness)}.`
      : bringsNewType.length
      ? `Time: adiciona tipo novo (${labelTypes(bringsNewType)}).`
      : addsCoverage.length
      ? `Time: ganha cobertura contra ${labelTypes(addsCoverage.slice(0, 3))}.`
      : `Time: muda pouco a cobertura.`;

  const nowSummary =
    wild.power > bestOut.power + 20
      ? `Agora: ${capitalize(wild.name)} chega mais forte no nível atual.`
      : bestOut.power > wild.power + 20
      ? `Agora: ${capitalize(bestOut.name)} ainda está mais pronto no nível atual.`
      : `Agora: ${capitalize(wild.name)} e ${capitalize(bestOut.name)} são próximos; o encaixe pesa mais.`;

  const keyPoints = [nowSummary, futureSummary, typeSummary];

  const alternatives = [bestReason];
  const nextBest =
    action === "trocar"
      ? best.reasons[0]
      : best.warnings.find((w) => w.includes("evolui") || w.includes("longo prazo")) ??
        best.warnings[0] ??
        best.reasons[0];
  if (nextBest) alternatives.push(nextBest);
  if (teamSpace.hasOpenSlot && action !== "adicionar") {
    alternatives.push(`Com vaga livre, o risco seria baixo: adicionar renderia ${teamSpace.delta >= 0 ? "+" : ""}${teamSpace.delta} no placar.`);
  }
  if (bestOut.name !== best.outName) {
    alternatives.push(`A melhor simulação avaliada foi contra ${capitalize(best.outName)}, não necessariamente contra ${capitalize(bestOut.name)}.`);
  }

  return {
    headline: `Comparação completa: ${wildLine} vs ${outLine}`,
    recommendation,
    shortRecommendation,
    keyPoints,
    scoreExplanation,
    sections: [
      { title: "Resumo por objetivo", tone: action === "trocar" || action === "adicionar" ? "good" : "neutral", points: perspectivePoints },
      { title: "Agora", tone: action === "trocar" ? "good" : "neutral", points: nowPoints },
      { title: "Futuro", tone: bestOut.willEvolve && action !== "trocar" ? "warn" : "neutral", points: futurePoints },
      { title: "Tipos e cobertura", tone: opened.length ? "warn" : typePoints.length > 1 ? "good" : "neutral", points: typePoints },
      { title: "Brechas do time", tone: opened.length ? "warn" : improved.length ? "good" : "neutral", points: gapPoints },
      { title: "Todas as trocas avaliadas", tone: "neutral", points: optionPoints },
    ],
    alternatives,
  };
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
    action: "ignorar" as const,
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
      teamSpace: null,
      detailedReport: {
        headline: `Perfil completo: ${capitalize(wild.name)}${wild.willEvolve ? ` -> ${capitalize(wild.finalName)}` : ""}`,
        recommendation: `Adicione membros à equipe para comparar troca, cobertura e brechas.`,
        shortRecommendation: `Adicione ${capitalize(wild.name)} à caixa ou equipe para comparar depois.`,
        keyPoints: [
          `Agora: poder estimado ${wild.power} no nível ${wild.level}.`,
          wild.willEvolve
            ? `Futuro: evolui até ${capitalize(wild.finalName)} (${wild.finalBst} base).`
            : `Futuro: já está na forma final (${wild.finalBst} base).`,
          `Tipos: ${labelTypes(wild.types)}.`,
        ],
        scoreExplanation: `Sem equipe principal, ainda não existe placar de troca.`,
        sections: [
          {
            title: "Agora",
            tone: "neutral",
            points: [
              `Poder estimado no nível ${wild.level}: ${wild.power}.`,
              `Função provável: ${roleLabel(wild.role)}.`,
            ],
          },
          {
            title: "Futuro",
            tone: wild.willEvolve ? "good" : "neutral",
            points: [
              wild.willEvolve
                ? `Evolui até ${capitalize(wild.finalName)}, chegando a ${wild.finalBst} de total base.`
                : `Não depende de evolução: forma final já é ${capitalize(wild.finalName)} com ${wild.finalBst} de total base.`,
            ],
          },
          {
            title: "Tipos",
            tone: "neutral",
            points: [
              `Tipos: ${labelTypes(wild.types)}.`,
              `Fraquezas: ${wild.weaknesses.length ? labelTypes(wild.weaknesses) : "nenhuma relevante"}.`,
              `Resistências: ${wild.resistances.length ? labelTypes(wild.resistances) : "nenhuma"}.`,
            ],
          },
        ],
        alternatives: [],
      },
      scores: {
        now: pokemonNowScore(wild),
        future: pokemonFutureScore(wild),
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
  const now = pokemonNowScore(wild);
  const future = pokemonFutureScore(wild);
  const teamSpace = {
    hasOpenSlot: teamProfiles.length < FULL_TEAM_SIZE,
    scoreAfter: round1(teamScore([...teamProfiles, wild])),
    delta: round1(teamScore([...teamProfiles, wild]) - scoreBefore),
  };
  const options: SwapOption[] = teamProfiles.map((m, i) => {
    const remaining = [...teamProfiles.slice(0, i), ...teamProfiles.slice(i + 1)];
    const replaced = [
      ...remaining,
      wild,
    ];
    const after = teamScore(replaced);
    const delta = round1(after - scoreBefore);
    const individualDelta = round1(memberScore(wild) - memberScore(m));
    const minDeltaRequired = requiredDeltaForSwap(m, wild, remaining);
    const lineDelta = linePotential01(wild) - linePotential01(m);
    const sacrificesBetterLine =
      lineDelta < -0.04 || (m.willEvolve && !wild.willEvolve && lineDelta < 0.04);
    const readyEnough =
      wild.power >= m.power * 0.86 ||
      wild.bst >= m.bst + 70 ||
      currentValue01(wild) >= currentValue01(m) - 0.04;
    const notOnlyFuture = now >= 5.8 || wild.power >= m.power * 0.95 || delta >= minDeltaRequired + 4;
    const recommended =
      delta >= minDeltaRequired &&
      (individualDelta >= -1.5 || delta >= minDeltaRequired + 3.5) &&
      readyEnough &&
      notOnlyFuture &&
      (!sacrificesBetterLine || delta >= minDeltaRequired + 4.5);
    const confidence = confidenceForSwap(delta, minDeltaRequired, individualDelta);
    const notes = buildSwapNotes(
      m,
      wild,
      remaining,
      delta,
      minDeltaRequired,
      individualDelta,
      recommended
    );

    return {
      outName: m.name,
      outImage: m.image,
      scoreAfter: round1(after),
      delta,
      individualDelta,
      minDeltaRequired,
      recommended,
      confidence,
      ...notes,
    };
  });
  const best = options.reduce((b, o) => {
    if (o.recommended !== b.recommended) return o.recommended ? o : b;
    return o.delta > b.delta ? o : b;
  });
  const bestSwap = {
    outName: best.outName,
    outImage: best.outImage,
    scoreBefore: round1(scoreBefore),
    scoreAfter: best.scoreAfter,
    delta: best.delta,
    individualDelta: best.individualDelta,
    minDeltaRequired: best.minDeltaRequired,
    recommended: best.recommended,
    confidence: best.confidence,
    reasons: best.reasons,
    warnings: best.warnings,
    options,
  };
  const bestOutProfile = teamProfiles.find((m) => m.name === best.outName) ?? teamProfiles[0];

  /* ---------- Notas ---------- */
  const fit = clamp10(
    4.8 +
      best.delta * 0.45 +
      coversTeamWeakness.length * 0.45 +
      Math.min(1.1, addsCoverage.length * 0.18) +
      (best.recommended ? 0.9 : 0) -
      repeatsType.length * 0.25
  );
  const scores = { now, future, fit };

  /* ---------- Veredito ---------- */
  const nowStrong = now >= 6.1;
  const futureStrong = future >= 7;
  const hasRecommendedSwap = best.recommended;
  const shouldAddToOpenSlot =
    teamSpace.hasOpenSlot && (now >= 5.2 || futureStrong || teamSpace.delta >= 1.5);

  let decision: "vale" | "nao-vale" | "so-futuro";
  let action: "adicionar" | "trocar" | "guardar" | "ignorar";

  if (shouldAddToOpenSlot) {
    decision = "vale";
    action = "adicionar";
  } else if (hasRecommendedSwap) {
    decision = "vale";
    action = "trocar";
  } else if (futureStrong && (wild.willEvolve || !nowStrong || best.delta > -1.5)) {
    decision = wild.willEvolve && !nowStrong ? "so-futuro" : "nao-vale";
    action = "guardar";
  } else {
    decision = "nao-vale";
    action = "ignorar";
  }

  const pros: string[] = [];
  const cons: string[] = [];

  if (shouldAddToOpenSlot)
    pros.push(`Ainda há vaga na equipe: não precisa tirar ninguém para testar ${capitalize(wild.name)}.`);
  if (hasRecommendedSwap)
    pros.push(
      `Passou a margem de troca: +${best.delta} no time, exigindo pelo menos +${best.minDeltaRequired}.`
    );
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
    pros.push(
      wild.willEvolve
        ? `Ótimo potencial: evolui até ${capitalize(wild.finalName)} (${wild.finalBst} de total base).`
        : `Já tem potencial alto sem depender de evolução (${wild.finalBst} de total base).`
    );
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
  if (!hasRecommendedSwap && !shouldAddToOpenSlot) {
    if (best.delta > 0)
      cons.push(
        `A melhor troca só ganha +${best.delta}; para ser segura precisaria de +${best.minDeltaRequired}.`
      );
    else cons.push(`Não melhora o equilíbrio geral do time na melhor troca possível.`);
  }
  if (!hasRecommendedSwap && best.warnings.length)
    cons.push(...best.warnings.slice(0, 2));
  if (!bringsNewType.length && !coversTeamWeakness.length && !addsCoverage.length)
    cons.push(`Não acrescenta tipo, cobertura ou defesa que o time já não tenha.`);

  let mainReason: string;
  if (action === "adicionar")
    mainReason = `Existe espaço livre, então o risco é baixo e ele pode ser testado sem sacrificar ninguém.`;
  else if (action === "trocar")
    mainReason = `A troca por ${capitalize(best.outName)} passa a margem mínima e melhora o time com confiança ${best.confidence}.`;
  else if (futureStrong && !nowStrong)
    mainReason = `O potencial futuro é bom, mas ele ainda não está pronto para tomar vaga no time principal.`;
  else if (best.delta > 0 && !best.recommended)
    mainReason = `O ganho existe, mas é pequeno demais para justificar tirar ${capitalize(best.outName)}.`;
  else if (action === "ignorar" && best.delta <= 0)
    mainReason = `A melhor troca derruba o equilíbrio geral do time, mesmo que ele tenha um ponto útil.`;
  else if (coversTeamWeakness.length)
    mainReason = `Cobre a fraqueza do time a ${labelTypes(coversTeamWeakness)}.`;
  else if (addsCoverage.length >= 3)
    mainReason = `Adiciona bastante cobertura ofensiva nova.`;
  else if (bringsNewType.length)
    mainReason = `Traz o tipo ${labelTypes(bringsNewType)}, que faltava no time.`;
  else mainReason = `O time já cobre o que ele oferece.`;

  let headline: string;
  if (action === "adicionar")
    headline = `Vale adicionar ${capitalize(wild.name)}: sua equipe ainda tem espaço.`;
  else if (action === "trocar")
    headline = `Vale trocar: tira ${capitalize(best.outName)} e coloca ${capitalize(wild.name)}.`;
  else if (action === "guardar")
    headline = `Não troca agora; guarda ${capitalize(wild.name)} para treinar.`;
  else headline = `Não compensa trocar agora — seu time já está bem servido.`;

  let summary: string;
  if (action === "adicionar")
    summary = `${capitalize(wild.name)} pode entrar sem troca. Depois compare de novo quando a equipe estiver cheia.`;
  else if (action === "trocar")
    summary = `${capitalize(wild.name)} encaixa bem: ${mainReason} Coloque no lugar do ${capitalize(best.outName)}.`;
  else if (action === "guardar")
    summary = wild.willEvolve
      ? `Agora ${capitalize(wild.name)} ainda não merece vaga, mas evoluído vira ${capitalize(wild.finalName)} e pode compensar. Vale guardar pra treinar.`
      : `${capitalize(wild.name)} é bom, mas não melhora sua equipe principal agora. Vale guardar no box se você gosta dele.`;
  else summary = `${capitalize(wild.name)} não agrega o bastante ao seu time atual. ${mainReason}`;

  const detailedReport = buildDetailedReport({
    action,
    wild,
    teamProfiles,
    bestOut: bestOutProfile,
    best,
    options,
    teamSpace,
    coversTeamWeakness,
    bringsNewType,
    repeatsType,
    addsCoverage,
  });

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
    teamSpace,
    detailedReport,
    scores,
    verdict: { decision, action, headline, mainReason, pros, cons, summary },
  };
}
