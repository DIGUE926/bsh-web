"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuickStartButton({
  gameId,
  gameType = "regular",
}: {
  gameId: string;
  gameType?: "regular" | "playoff";
}) {
  const router = useRouter();
  const table = gameType === "regular" ? "games" : "playoff_games";
  const path = gameType === "regular" ? `/admin/match/${gameId}/live` : `/admin/playoffs/match/${gameId}/live`;

  async function start(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from(table).update({ status: "live" }).eq("id", gameId);
    router.push(path);
  }

  return (
    <button
      onClick={start}
      className="relative z-10 text-xs bg-red-600 text-white font-bold rounded px-2 py-1 hover:bg-red-500"
    >
      ● Démarrer
    </button>
  );
}
