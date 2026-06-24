"use client";

import { useState } from "react";
import Image from "next/image";
import { PokemonForm } from "@/lib/types";

export default function FormPicker({
  name,
  onSelect,
}: {
  name: string;
  onSelect: (formName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<PokemonForm[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!open && !forms) {
      setLoading(true);
      try {
        const r = await fetch(`/api/pokemon-extra/${name}`);
        const d = await r.json();
        setForms(d.forms ?? []);
      } catch {
        setForms([]);
      }
      setLoading(false);
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
      >
        ⟳ Forma
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-30 mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-[#0c1330]/95 shadow-2xl backdrop-blur-xl">
          {loading && <p className="px-3 py-2 text-xs text-white/50">Carregando...</p>}
          {forms && forms.length <= 1 && (
            <p className="px-3 py-2 text-xs text-white/50">Sem outras formas.</p>
          )}
          {forms &&
            forms.length > 1 &&
            forms.map((f) => (
              <button
                key={f.name}
                onClick={() => {
                  onSelect(f.name);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                  f.name === name ? "bg-white/10 font-bold text-white" : "text-white/80"
                }`}
              >
                {f.sprite && (
                  <Image src={f.sprite} alt={f.label} width={28} height={28} unoptimized />
                )}
                <span>{f.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
