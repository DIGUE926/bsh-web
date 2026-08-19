import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";

export const revalidate = 60;

const ROUND_LABELS: Record<string, string> = {
  demi_finale_1: "Demi-finale 1",
  demi_finale_2: "Demi-finale 2",
  petite_finale: "Petite finale",
  finale: "Finale",
};

const ROUND_ORDER = ["demi_finale_1", "demi_finale_2", "petite_finale", "finale"];

type PlayoffGame = {
  id: string;
  round: string;
  game_number: number;
  game_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  team_home: { id: string; name: string } | null;
  team_away: { id: string; name: string } | null;
};

export default async function PlayoffsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!league) notFound();

  const { data: games } = await supabase
    .from("playoff_games")
    .select(
      "*, team_home:team_home_id(id,name), team_away:team_away_id(id,name)"
    )
    .eq("league_id", league.id)
    .order("game_date", { ascending: true });

  const rows = (games ?? []) as unknown as PlayoffGame[];

  const grouped = ROUND_ORDER.reduce<Record<string, PlayoffGame[]>>(
    (acc, round) => {
      acc[round] = rows
        .filter((g) => g.round === round)
        .sort((a, b) => a.game_number - b.game_number);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: league.name, href: `/${slug}` }, { label: "Playoffs" }]} />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        PLAYOFFS {league.name.toUpperCase()}
      </h1>
      <p className="text-white/50 mb-6">Route vers le titre</p>

      <div className="flex gap-2 mb-8 overflow-x-auto text-sm font-semibold">
        <span className="px-4 py-2 rounded-lg bg-bsh-orange text-black whitespace-nowrap">
          Bracket
        </span>
        <Link
          href={`/${slug}/playoffs/equipes`}
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Équipes
        </Link>
        <Link
          href={`/${slug}/playoffs/classement`}
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Leaders playoffs
        </Link>
      </div>

      {ROUND_ORDER.map((round) => {
        const roundGames = grouped[round];
        if (!roundGames || roundGames.length === 0) return null;
        return (
          <div key={round} className="mb-6">
            <h2 className="font-display text-lg text-bsh-gold mb-4 tracking-wide">
              {ROUND_LABELS[round]}
            </h2>
            <div className="space-y-3">
              {roundGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/${slug}/playoffs/${game.id}`}
                  className="block border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40 uppercase mb-1">
                        Match {game.game_number}
                      </p>
                      <p className="font-semibold">
                        {game.team_home?.name ?? "?"} vs{" "}
                        {game.team_away?.name ?? "?"}
                      </p>
                      <p className="text-sm text-white/50">{game.game_date}</p>
                    </div>
                    <div className="text-right">
                      {game.status === "completed" ? (
                        <p className="font-display text-lg text-bsh-gold">
                          {game.home_score} - {game.away_score}
                        </p>
                      ) : (
                        <p className="text-xs text-white/40 uppercase">
                          À venir
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <p className="text-white/50">Calendrier playoffs à venir.</p>
      )}
    </div>
  );
}
