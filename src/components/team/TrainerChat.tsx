"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Member {
  name: string;
  level: number;
}
interface Msg {
  role: "user" | "model";
  text: string;
}

const SUGGESTIONS = [
  "Analisa minha equipe",
  "Minha equipe está forte?",
  "Que tipo de Pokémon me falta?",
];

export default function TrainerChat({
  team,
  box,
}: {
  team: Member[];
  box: Member[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setError(null);
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/treinador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history,
          team: team.map((t) => ({ name: t.name, level: t.level })),
          box: box.map((b) => ({ name: b.name, level: b.level })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao falar com a IA.");
      } else {
        setMessages((m) => [...m, { role: "model", text: data.reply }]);
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-strong flex flex-col rounded-3xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        🤖 Treinador IA
      </h2>
      <p className="mb-4 text-sm text-white/60">
        Converse com seu mentor Pokémon. Conte o que capturou ou pergunte sobre a
        equipe — ele conhece sua equipe, sua caixa e os dados de todos os Pokémon.
      </p>

      <div className="mb-4 flex max-h-[460px] min-h-[120px] flex-col gap-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-4 text-sm text-white/85">
            E aí, treinador! 👋 Sou seu mentor Pokémon. Me conta o que você pegou
            ou pergunta sobre sua equipe que eu te ajudo. Por exemplo:{" "}
            <span className="text-violet-200">
              &quot;peguei um Gengar nível 30, vale a pena?&quot;
            </span>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-500/30 text-white"
                  : "border border-white/12 bg-white/5 text-white/90"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white/50">
              digitando...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/15"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-sm text-rose-200">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao treinador... (ex: peguei um Snorlax nv 40, vale?)"
          className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
        />
        <button type="submit" disabled={loading} className="btn-accent px-5 py-2.5">
          Enviar
        </button>
      </form>
    </section>
  );
}
