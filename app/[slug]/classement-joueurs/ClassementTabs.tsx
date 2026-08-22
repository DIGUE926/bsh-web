"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClassementTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/${slug}/classement-joueurs`, label: "Général" },
    { href: `/${slug}/classement-joueurs/positions`, label: "Par position" },
    { href: `/${slug}/classement-joueurs/ppg`, label: "PPG" },
    { href: `/${slug}/classement-joueurs/rpg`, label: "RPG" },
    { href: `/${slug}/classement-joueurs/apg`, label: "APG" },
    { href: `/${slug}/classement-joueurs/spg`, label: "SPG" },
    { href: `/${slug}/classement-joueurs/bpg`, label: "BPG" },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto text-sm font-semibold">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              active
                ? "bg-bsh-orange text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
