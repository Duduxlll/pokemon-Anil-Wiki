// Rótulo em português para formas/variedades de Pokémon.
const FORM_LABELS: Record<string, string> = {
  alola: "Forma de Alola",
  galar: "Forma de Galar",
  hisui: "Forma de Hisui",
  paldea: "Forma de Paldea",
  totem: "Forma Totem",
  gmax: "Gigamax",
  mega: "Mega Evolução",
  "mega-x": "Mega Evolução X",
  "mega-y": "Mega Evolução Y",
  "paldea-combat": "Forma de Paldea (Combate)",
  "paldea-blaze": "Forma de Paldea (Brasa)",
  "paldea-aqua": "Forma de Paldea (Aqua)",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getFormLabel(name: string, isDefault: boolean): string {
  if (isDefault) return "Forma normal";
  const idx = name.indexOf("-");
  if (idx < 0) return "Forma normal";
  const suffix = name.slice(idx + 1);
  if (FORM_LABELS[suffix]) return FORM_LABELS[suffix];
  return "Forma " + suffix.split("-").map(capitalize).join(" ");
}
