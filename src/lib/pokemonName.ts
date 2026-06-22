const DEFAULT_FORM_ALIASES: Record<string, string> = {
  aegislash: "aegislash-shield",
  basculegion: "basculegion-male",
  basculin: "basculin-red-striped",
  darmanitan: "darmanitan-standard",
  dudunsparce: "dudunsparce-two-segment",
  eiscue: "eiscue-ice",
  giratina: "giratina-altered",
  gourgeist: "gourgeist-average",
  indeedee: "indeedee-male",
  keldeo: "keldeo-ordinary",
  landorus: "landorus-incarnate",
  lycanroc: "lycanroc-midday",
  maushold: "maushold-family-of-four",
  meloetta: "meloetta-aria",
  meowstic: "meowstic-male",
  mimikyu: "mimikyu-disguised",
  minior: "minior-red-meteor",
  morpeko: "morpeko-full-belly",
  oinkologne: "oinkologne-male",
  oricorio: "oricorio-baile",
  palafin: "palafin-zero",
  pumpkaboo: "pumpkaboo-average",
  shaymin: "shaymin-land",
  squawkabilly: "squawkabilly-green-plumage",
  tatsugiri: "tatsugiri-curly",
  thundurus: "thundurus-incarnate",
  tornadus: "tornadus-incarnate",
  toxtricity: "toxtricity-amped",
  urshifu: "urshifu-single-strike",
  wishiwashi: "wishiwashi-solo",
  wormadam: "wormadam-plant",
  zygarde: "zygarde-50",
  "nidoran-female": "nidoran-f",
  "nidoran-male": "nidoran-m",
};

export function normalizePokemonName(value: string | number): string {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[’']/g, "")
    .replace(/[._:\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolvePokemonName(value: string | number): string {
  const normalized = normalizePokemonName(value);
  return DEFAULT_FORM_ALIASES[normalized] ?? normalized;
}
