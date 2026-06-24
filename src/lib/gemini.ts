// Integração com a API gratuita do Google Gemini (tier free do AI Studio).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export class GeminiError extends Error {}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function callGeminiChat(
  systemInstruction: string,
  turns: ChatTurn[]
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError("NO_KEY");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: { temperature: 0.75, maxOutputTokens: 900 },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new GeminiError(`Gemini respondeu ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError("Resposta vazia da IA.");
  }
  return text;
}
