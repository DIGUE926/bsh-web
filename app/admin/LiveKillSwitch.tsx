"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LIVE_SCORING_KEY = "live_scoring_enabled";

export default function LiveKillSwitch({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const next = !enabled;
    const { error } = await supabase
      .from("app_settings")
      .update({ value: next, updated_at: new Date().toISOString() })
      .eq("key", LIVE_SCORING_KEY);

    if (!error) {
      setEnabled(next);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 mb-4 border rounded-lg px-4 py-3 ${
        enabled
          ? "border-white/10 bg-white/5"
          : "border-red-500/40 bg-red-500/10"
      }`}
    >
      <div>
        <p className="text-sm font-semibold">
          Scoreboard Live :{" "}
          <span className={enabled ? "text-green-400" : "text-red-400"}>
            {enabled ? "Activé" : "Désactivé"}
          </span>
        </p>
        <p className="text-xs text-white/50">
          {enabled
            ? "La saisie live et le hub /live sont actifs sur tout le site."
            : "La saisie live est bloquée partout. Le reste du site n'est pas affecté."}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs font-bold rounded px-3 py-2 whitespace-nowrap transition-opacity ${
          enabled
            ? "bg-red-600 text-white hover:bg-red-500"
            : "bg-green-600 text-white hover:bg-green-500"
        } ${loading ? "opacity-50" : ""}`}
      >
        {loading ? "…" : enabled ? "Désactiver" : "Réactiver"}
      </button>
    </div>
  );
}
