"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QuickStartButton({ gameId }: { gameId: string }) {
  const router = useRouter();

  async function start(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("games").update({ status: "live" }).eq("id", gameId);
    router.push(`/admin/match/${gameId}/live`);
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
