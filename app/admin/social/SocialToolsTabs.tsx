"use client";

import { useState } from "react";
import TopLeadersGenerator from "./TopLeadersGenerator";
import MatchRecapGenerator from "./MatchRecapGenerator";
import PlayerCarouselGenerator from "./PlayerCarouselGenerator";
import TeamBreakdownGenerator from "./TeamBreakdownGenerator";
import SeasonWrappedGenerator from "./SeasonWrappedGenerator";
import StartingFiveGenerator from "./StartingFiveGenerator";

type Tab = "leaders" | "recap" | "carousel" | "team" | "wrapped" | "five";

const TABS: { key: Tab; label: string }[] = [
  { key: "leaders", label: "Top Leaders" },
  { key: "recap", label: "Récap de match" },
  { key: "carousel", label: "Carrousel joueur" },
  { key: "team", label: "Team Breakdown" },
  { key: "wrapped", label: "Season Wrapped" },
  { key: "five", label: "Cinq de départ" },
];

export default function SocialToolsTabs() {
  const [tab, setTab] = useState<Tab>("leaders");

  return (
    <div>
      <nav className="flex items-center gap-1.5 mb-6 pb-3 border-b border-white/10 text-sm overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {tab === "leaders" && <TopLeadersGenerator />}
      {tab === "recap" && <MatchRecapGenerator />}
      {tab === "carousel" && <PlayerCarouselGenerator />}
      {tab === "team" && <TeamBreakdownGenerator />}
      {tab === "wrapped" && <SeasonWrappedGenerator />}
      {tab === "five" && <StartingFiveGenerator />}
    </div>
  );
}
