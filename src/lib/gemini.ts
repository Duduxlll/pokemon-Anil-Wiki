// Integração com a API gratuita do Google Gemini (tier free do AI Studio).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export class GeminiError extends Error {}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGeminiChat(
  systemInstruction: string,
  turns: ChatTurn[]
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError("NO_KEY");
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: 0.75, maxOutputTokens: 900 },
  });

  let lastStatus = 0;
  // a API responde 403/503 de forma intermitente nesta chave — tenta de novo
  // rápido, que normalmente cai num servidor que aceita.
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (text) return text;
      lastStatus = 200;
    } else {
      lastStatus = res.status;
      if (![403, 429, 500, 503].includes(res.status)) break;
    }
    await sleep(400);
  }

  throw new GeminiError(`Gemini indisponível (${lastStatus})`);
}
