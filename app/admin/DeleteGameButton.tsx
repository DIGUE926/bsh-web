"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteGameButton({ gameId }: { gameId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    // Supprime d'abord les stats liées, puis le match
    await supabase.from("player_game_stats").delete().eq("game_id", gameId);
    await supabase.from("games").delete().eq("id", gameId);
    setDeleting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
        confirming
          ? "bg-red-500 text-white"
          : "bg-white/5 text-white/50 hover:text-red-400"
      }`}
    >
      {deleting ? "..." : confirming ? "Confirmer ?" : "Supprimer"}
    </button>
  );
}
