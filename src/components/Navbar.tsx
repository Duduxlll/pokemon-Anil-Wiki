"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PokeballIcon, DropIcon, StarIcon, TeamIcon } from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const LINKS: NavItem[] = [
  { href: "/", label: "Pokédex", icon: PokeballIcon, accent: "#ef4444" },
  { href: "/tipos", label: "Tipos", icon: DropIcon, accent: "#38bdf8" },
  { href: "/recomendador", label: "Recomendador", icon: StarIcon, accent: "#fbbf24" },
  { href: "/equipe", label: "Minha Equipe", icon: TeamIcon, accent: "#a855f7" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/pokemon");
  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a1130]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-bold">
          <PokeballIcon className="h-8 w-8 transition-transform group-hover:rotate-[20deg]" />
          <span className="text-base text-white sm:text-lg">
            Pokémon <span className="text-amber-400">Anil</span>
            <span className="hidden text-white/70 sm:inline"> — Wiki</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold transition-all sm:px-4 ${
                  active
                    ? "text-white shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${link.accent}cc, ${link.accent}88)`,
                        boxShadow: `0 6px 20px ${link.accent}55`,
                      }
                    : undefined
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
