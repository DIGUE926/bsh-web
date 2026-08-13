"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/classement", label: "Général" },
  { href: "/classement/ppg", label: "PPG" },
  { href: "/classement/rpg", label: "RPG" },
  { href: "/classement/apg", label: "APG" },
  { href: "/classement/spg", label: "SPG" },
  { href: "/classement/bpg", label: "BPG" },
];

export default function ClassementTabs() {
  const pathname = usePathname();

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
