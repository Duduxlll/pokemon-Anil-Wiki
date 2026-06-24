import { NextRequest, NextResponse } from "next/server";
import { ROLE_LABEL, summarizeTeam } from "@/lib/compare";
import { callGemini, GeminiError } from "@/lib/gemini";
import { TYPE_LABELS_PT } from "@/lib/typeMeta";
import { PokemonTypeName } from "@/lib/types";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
function ptTypes(types: PokemonTypeName[]) {
  return types.length ? types.map((t) => TYPE_LABELS_PT[t]).join(", ") : "nenhum";
}

const SYSTEM = `Você é um treinador veterano de Pokémon e conselheiro de equipe do jogo Pokémon Anil. Responda SEMPRE em português brasileiro, de forma amigável, direta e prática, como um amigo experiente dando conselho.

Regras importantes:
- Dê uma visão de CONJUNTO da equipe. NÃO fique mandando trocar Pokémon à toa nem entre num "looping" de sugerir troca atrás de troca.
- Lembre que só cabem 6 Pokémon — é impossível ter os 18 tipos. NÃO trate isso como defeito.
- Se a equipe está equilibrada, diga claramente para o jogador MANTER a equipe assim.
- Só sugira mudança se houver um problema real (uma fraqueza que vários membros sofrem, ou falta de cobertura importante). Nesse caso, diga QUE TIPO procurar e por quê.
- Seja conciso: no máximo 3 parágrafos curtos. Use os nomes dos Pokémon. Não use markdown pesado, escreva de forma natural.`;

export async function POST(req: NextRequest) {
  let body: { team?: { name: string; level: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const team = Array.isArray(body.team) ? body.team : [];
  if (team.length === 0) {
    return NextResponse.json(
      { error: "Monte sua equipe principal primeiro pra eu analisar." },
      { status: 400 }
    );
  }

  try {
    const s = await summarizeTeam(
      team.map((t) => ({ name: String(t.name).toLowerCase(), level: Number(t.level) || 1 }))
    );

    const membersText = s.members
      .map(
        (m, i) =>
          `${i + 1}. ${capitalize(m.name)} (nível ${m.level}) — tipo ${ptTypes(m.types)} — função: ${ROLE_LABEL[m.role]} — fraco contra: ${ptTypes(m.weaknesses)}${
            m.willEvolve ? ` — ainda evolui até ${capitalize(m.finalName)}` : ""
          }`
      )
      .join("\n");

    const prompt = `Esta é a minha equipe principal no Pokémon Anil:
${membersText}

Dados já calculados da equipe:
- Tipos presentes: ${ptTypes(s.typesPresent)}
- Tipos que faltam: ${ptTypes(s.typesMissing)}
- Fraquezas que 2 ou mais membros compartilham (perigoso): ${ptTypes(s.sharedWeaknesses)}
- Tipos que a equipe NÃO consegue atingir com vantagem ofensiva: ${ptTypes(s.uncoveredTypes)}
- Nota de equilíbrio do time (0 a 100): ${s.teamScore}

Faça uma análise da minha equipe: ela está boa e equilibrada? Devo manter assim ou seria bom procurar algum tipo específico de Pokémon? Se for procurar, qual tipo e por quê? Dê o conselho final.`;

    const advice = await callGemini(SYSTEM, prompt);
    return NextResponse.json({ advice, teamScore: s.teamScore });
  } catch (err) {
    if (err instanceof GeminiError && err.message === "NO_KEY") {
      return NextResponse.json(
        { error: "A IA ainda não foi configurada (falta a chave do Gemini)." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Não consegui falar com a IA agora. Tente de novo em instantes." },
      { status: 502 }
    );
  }
}
