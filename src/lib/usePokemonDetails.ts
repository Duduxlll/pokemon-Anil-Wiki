"use client";

import { useEffect, useRef, useState } from "react";
import { PokemonDetail } from "./types";

type DetailState = { status: "loading" | "ready" | "error"; data: PokemonDetail | null };

const globalCache = new Map<string, PokemonDetail>();

export function usePokemonDetails(names: string[]) {
  const [map, setMap] = useState<Record<string, DetailState>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    names.forEach((name) => {
      const key = name.toLowerCase();
      if (requested.current.has(key)) return;
      requested.current.add(key);

      const cached = globalCache.get(key);
      if (cached) {
        setMap((prev) => ({ ...prev, [key]: { status: "ready", data: cached } }));
        return;
      }

      setMap((prev) => ({ ...prev, [key]: { status: "loading", data: null } }));
      fetch(`/api/pokemon/${encodeURIComponent(key)}`)
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((data: PokemonDetail) => {
          globalCache.set(key, data);
          setMap((prev) => ({ ...prev, [key]: { status: "ready", data } }));
        })
        .catch(() => {
          setMap((prev) => ({ ...prev, [key]: { status: "error", data: null } }));
        });
    });
  }, [names]);

  return map;
}
