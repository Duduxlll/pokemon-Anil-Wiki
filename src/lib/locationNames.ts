// Nomes de locais de Kanto em português (a PokéAPI fornece em inglês).
const LOCATION_LABELS: Record<string, string> = {
  "pallet-town-area": "Vila Pallet",
  "viridian-city-area": "Cidade de Viridian",
  "viridian-forest-area": "Floresta de Viridian",
  "pewter-city-area": "Cidade de Pewter",
  "cerulean-city-area": "Cidade de Cerulean",
  "vermilion-city-area": "Cidade de Vermilion",
  "lavender-town-area": "Vila Lavender",
  "celadon-city-area": "Cidade de Celadon",
  "fuchsia-city-area": "Cidade de Fuchsia",
  "saffron-city-area": "Cidade de Saffron",
  "cinnabar-island-area": "Ilha Cinnabar",
  "indigo-plateau-area": "Planalto Índigo",
  "kanto-power-plant-area": "Usina de Energia",
  "kanto-safari-zone-area": "Zona Safári",
  "kanto-victory-road-1-area": "Estrada da Vitória",
  "digletts-cave-area": "Caverna dos Diglett",
  "pokemon-mansion-b1f": "Mansão Pokémon (subsolo)",
};

const FLOOR_PT: Record<string, string> = {
  "1f": "1º andar",
  "2f": "2º andar",
  "3f": "3º andar",
  "4f": "4º andar",
  "5f": "5º andar",
  "6f": "6º andar",
  "7f": "7º andar",
  "b1f": "subsolo 1",
  "b2f": "subsolo 2",
  "b3f": "subsolo 3",
  "b4f": "subsolo 4",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getLocationLabel(area: string): string {
  if (LOCATION_LABELS[area]) return LOCATION_LABELS[area];

  // Rotas: kanto-route-5-area / kanto-sea-route-19-area
  const route = area.match(/route-(\d+)/);
  if (route) {
    const sea = area.includes("sea-route") ? "Rota marítima" : "Rota";
    return `${sea} ${route[1]}`;
  }

  // Locais com andar: rock-tunnel-1f, mt-moon-b1f, pokemon-tower-3f...
  const floor = area.match(/-(b?\d+f)$/);
  let base = area.replace(/-area$/, "");
  let floorLabel = "";
  if (floor) {
    floorLabel = ` (${FLOOR_PT[floor[1]] ?? floor[1].toUpperCase()})`;
    base = base.slice(0, base.length - floor[1].length - 1);
  }

  const NAMED: Record<string, string> = {
    "mt-moon": "Monte da Lua",
    "rock-tunnel": "Túnel da Rocha",
    "pokemon-tower": "Torre Pokémon",
    "pokemon-mansion": "Mansão Pokémon",
    "seafoam-islands": "Ilhas Seafoam",
    "cerulean-cave": "Caverna de Cerulean",
    "kanto-victory-road": "Estrada da Vitória",
  };
  if (NAMED[base]) return NAMED[base] + floorLabel;

  return base.split("-").map(capitalize).join(" ") + floorLabel;
}
