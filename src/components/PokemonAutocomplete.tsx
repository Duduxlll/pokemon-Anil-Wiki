"use client";

import { useEffect, useRef, useState } from "react";
import { PokemonListItem } from "@/lib/types";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

export default function PokemonAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (name: string) => void;
  placeholder?: string;
}) {
  const [allNames, setAllNames] = useState<PokemonListItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/pokemon-names")
      .then((res) => res.json())
      .then((data: PokemonListItem[]) => setAllNames(data))
      .catch(() => setAllNames([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const suggestions =
    query.length === 0
      ? []
      : allNames.filter((p) => p.name.startsWith(query)).slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="glass-input w-full rounded-lg px-3 py-2"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/15 bg-[#0c1330]/95 shadow-2xl backdrop-blur-xl">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm capitalize text-white/85 transition-colors hover:bg-white/10"
              >
                {capitalize(p.name)}
                <span className="font-mono text-xs text-white/40">
                  #{String(p.id).padStart(3, "0")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
