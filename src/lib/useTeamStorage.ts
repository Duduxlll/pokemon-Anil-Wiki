"use client";

import { useCallback, useEffect, useState } from "react";

export interface OwnedPokemon {
  id: string;
  name: string;
  level: number;
  inTeam: boolean;
}

const STORAGE_KEY = "pokemon-anil-equipe";
const MAX_TEAM_SIZE = 6;

function loadFromStorage(): OwnedPokemon[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OwnedPokemon[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: OwnedPokemon[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useTeamStorage() {
  const [entries, setEntries] = useState<OwnedPokemon[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadFromStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: OwnedPokemon[]) => {
    setEntries(next);
    saveToStorage(next);
  }, []);

  const addPokemon = useCallback(
    (name: string, level: number) => {
      const entry: OwnedPokemon = {
        id: `${name}-${Date.now()}`,
        name,
        level,
        inTeam: false,
      };
      setEntries((prev) => {
        const next = [...prev, entry];
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const removePokemon = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateLevel = useCallback((id: string, level: number) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, level } : e));
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, name } : e));
      saveToStorage(next);
      return next;
    });
  }, []);

  const teamCount = entries.filter((e) => e.inTeam).length;

  const toggleInTeam = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const target = prev.find((e) => e.id === id);
        if (!target) return prev;
        if (!target.inTeam && teamCount >= MAX_TEAM_SIZE) return prev;
        const next = prev.map((e) =>
          e.id === id ? { ...e, inTeam: !e.inTeam } : e
        );
        saveToStorage(next);
        return next;
      });
    },
    [teamCount]
  );

  return {
    entries,
    loaded,
    addPokemon,
    removePokemon,
    updateLevel,
    updateName,
    toggleInTeam,
    teamCount,
    maxTeamSize: MAX_TEAM_SIZE,
    persist,
  };
}
