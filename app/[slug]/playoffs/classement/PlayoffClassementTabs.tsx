"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PlayoffClassementTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/${slug}/playoffs/classement`, label: "Général" },
    { href: `/${slug}/playoffs/classement/ppg`, label: "PPG" },
    { href: `/${slug}/playoffs/classement/rpg`, label: "RPG" },
    { href: `/${slug}/playoffs/classement/apg`, label: "APG" },
    { href: `/${slug}/playoffs/classement/spg`, label: "SPG" },
    { href: `/${slug}/playoffs/classement/bpg`, label: "BPG" },
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
