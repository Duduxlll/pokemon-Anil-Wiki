import { PokemonStat } from "./types";

const HP_LABEL = "HP";

function estimateStat(base: number, level: number, isHp: boolean): number {
  const core = Math.floor((2 * base * level) / 100);
  return isHp ? core + level + 10 : core + 5;
}

export interface EstimatedStats {
  stats: { name: string; base: number; estimated: number }[];
  total: number;
}

export function estimateStatsAtLevel(
  stats: PokemonStat[],
  level: number
): EstimatedStats {
  const estimated = stats.map((s) => ({
    name: s.name,
    base: s.base,
    estimated: estimateStat(s.base, level, s.name === HP_LABEL),
  }));
  const total = estimated.reduce((sum, s) => sum + s.estimated, 0);
  return { stats: estimated, total };
}
