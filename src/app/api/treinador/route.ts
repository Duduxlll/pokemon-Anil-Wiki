import { NextRequest, NextResponse } from "next/server";
import { ROLE_LABEL, summarizeTeam } from "@/lib/compare";
import {
  getEvolutionPath,
  getPokemonDetail,
  getSearchableNameList,
} from "@/lib/pokeapi";
import { callGeminiChat, ChatTurn, GeminiError } from "@/lib/gemini";
import { TYPE_LABELS_PT } from "@/lib/typeMeta";
import { normalizePokemonName } from "@/lib/pokemonName";
import { PokemonTypeName } from "@/lib/types";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
function ptTypes(types: PokemonTypeName[]) {
  return types.length ? types.map((t) => TYPE_LABELS_PT[t]).join("/") : "—";
}

const SYSTEM_BASE = `Você é o melhor treinador Pokémon do mundo e mentor especialista no jogo Pokémon Anil (um fangame com todas as 9 gerações de Pokémon). Você é amigável, animado e dá conselhos certeiros sobre capturar, montar e melhorar equipes.

Você domina profundamente: tipos e suas vantagens/fraquezas, evoluções (presente e futuro), status base, papéis (atacante físico, atacante especial, tanque, suporte, veloz/finalizador) e estratégia de equipe.

Regras de comportamento:
- Responda SEMPRE em português brasileiro, de forma natural, amigável e direta, como um amigo experiente.
- Use os DADOS fornecidos no contexto (equipe, caixa e Pokémon citados). Eles vêm da PokéAPI e são precisos — confie neles em vez de chutar.
- Quando perguntarem se vale a pena trocar/colocar um Pokémon, analise: tipo, status, papel, sinergia com a equipe, fraquezas que ele cobre, e o potencial de evolução agora e no futuro. Termine com um veredito claro (vale a pena, não vale, ou vale de olho no futuro).
- Pense na equipe como CONJUNTO. NÃO mande trocar Pokémon à toa nem fique num looping de troca. Se a equipe está boa, diga claramente para manter.
- Lembre que só cabem 6 Pokémon na equipe — é impossível ter os 18 tipos, então não trate isso como defeito.
- Se a pergunta NÃO tiver nada a ver com Pokémon ou com o jogo, recuse com simpatia: diga que você é um treinador Pokémon e só conversa sobre Pokémon e sobre o Pokémon Anil.
- Seja conciso (no máximo 3 parágrafos curtos). Use os nomes dos Pokémon. Não use markdown pesado.`;

async function buildContext(
  team: { name: string; level: number }[],
  box: { name: string; level: number }[]
): Promise<string> {
  let ctx = "CONTEXTO ATUAL DO JOGADOR\n";

  if (team.length === 0) {
    ctx += "Equipe principal: vazia (o jogador ainda não montou a equipe).\n";
  } else {
    const s = await summarizeTeam(
      team.map((t) => ({ name: normalizePokemonName(t.name), level: Number(t.level) || 1 }))
    );
    ctx += `Equipe principal (${s.members.length}/6) — nota de equilíbrio ${s.teamScore}/100:\n`;
    ctx += s.members
      .map(
        (m) =>
          `- ${capitalize(m.name)} (nv ${m.level}), tipo ${ptTypes(m.types)}, ${ROLE_LABEL[m.role]}, fraco contra ${ptTypes(m.weaknesses)}${m.willEvolve ? `, ainda evolui até ${capitalize(m.finalName)}` : ""}`
      )
      .join("\n");
    ctx += `\nTipos presentes: ${ptTypes(s.typesPresent)}\nTipos que faltam: ${ptTypes(s.typesMissing)}\nFraquezas que 2+ membros compartilham: ${ptTypes(s.sharedWeaknesses)}\nTipos sem cobertura ofensiva: ${ptTypes(s.uncoveredTypes)}\n`;
  }

  if (box.length > 0) {
    ctx += `\nCaixa de Pokémon guardados (${box.length}): ${box
      .slice(0, 30)
      .map((b) => `${capitalize(b.name)} (nv ${b.level})`)
      .join(", ")}\n`;
  }

  return ctx;
}

async function detectMentioned(message: string): Promise<string[]> {
  const names = await getSearchableNameList();
  const norm = normalizePokemonName(message);
  const tokens = new Set(norm.split("-"));
  const found: string[] = [];
  for (const n of names) {
    const plain = n.name.replace(/-/g, "");
    if (tokens.has(n.name) || tokens.has(plain) || norm.includes(n.name)) {
      if (!found.includes(n.name)) found.push(n.name);
      if (found.length >= 4) break;
    }
  }
  return found;
}

async function describeMentioned(names: string[]): Promise<string> {
  const parts = await Promise.all(
    names.map(async (n) => {
      try {
        const d = await getPokemonDetail(n);
        const path = await getEvolutionPath(d.name);
        const stats = d.stats.map((s) => `${s.name} ${s.base}`).join(", ");
        const evo = path.stages
          .map((s) => capitalize(s.name) + (s.minLevel ? ` (nv ${s.minLevel})` : ""))
          .join(" → ");
        return `${capitalize(d.name)} — tipo ${ptTypes(d.types)} — status base: ${stats} — habilidades: ${d.abilities.join(", ")} — linha de evolução: ${evo}`;
      } catch {
        return null;
      }
    })
  );
  return parts.filter(Boolean).join("\n");
}

export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    history?: ChatTurn[];
    team?: { name: string; level: number }[];
    box?: { name: string; level: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
  }
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const team = Array.isArray(body.team) ? body.team : [];
  const box = Array.isArray(body.box) ? body.box : [];

  try {
    const [context, mentioned] = await Promise.all([
      buildContext(team, box),
      detectMentioned(message),
    ]);
    const mentionedInfo = mentioned.length ? await describeMentioned(mentioned) : "";

    const system =
      SYSTEM_BASE +
      "\n\n" +
      context +
      (mentionedInfo
        ? `\n\nDADOS DOS POKÉMON CITADOS NA CONVERSA (da PokéAPI):\n${mentionedInfo}`
        : "");

    const turns: ChatTurn[] = [
      ...history.filter((t) => t && (t.role === "user" || t.role === "model") && t.text),
      { role: "user", text: message },
    ];

    const reply = await callGeminiChat(system, turns);
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof GeminiError && err.message === "NO_KEY") {
      return NextResponse.json(
        { error: "A IA ainda não foi configurada (falta a chave do Gemini)." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Não consegui falar com a IA agora. Tenta de novo em instantes." },
      { status: 502 }
    );
  }
}
