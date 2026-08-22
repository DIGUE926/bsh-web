"use client";

import { useState } from "react";
import TeamsStaffEditor from "./TeamsStaffEditor";
import PlayersPositionEditor from "./PlayersPositionEditor";

type Tab = "staff" | "positions";

const TABS: { key: Tab; label: string }[] = [
  { key: "staff", label: "Staff" },
  { key: "positions", label: "Positions" },
];

export default function EquipesTabs() {
  const [tab, setTab] = useState<Tab>("staff");

  return (
    <div>
      <nav className="flex items-center gap-1.5 mb-6 pb-3 border-b border-white/10 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full font-semibold transition-colors ${
              tab === t.key
                ? "bg-bsh-orange text-black"
                : "bg-white/5 text-white/60 hover:text-bsh-orange"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "staff" && <TeamsStaffEditor />}
      {tab === "positions" && <PlayersPositionEditor />}
    </div>
  );
}
