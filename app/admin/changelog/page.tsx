import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";
import { changelogEntries } from "@/lib/changelogData";

export const dynamic = "force-dynamic";

function groupByDay(entries: typeof changelogEntries) {
  const groups = new Map<string, typeof changelogEntries>();
  for (const entry of entries) {
    const day = new Date(entry.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(entry);
  }
  return groups;
}

export default async function ChangelogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/admin");

  const grouped = groupByDay(changelogEntries);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          MISES À JOUR DU SITE
        </h1>
        <span className="text-xs text-white/30">
          {changelogEntries.length} changements
        </span>
      </div>
      <p className="text-white/50 mb-8 text-sm">
        Historique complet de chaque modification poussée sur bsh-web, avec
        date et heure exactes.
      </p>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([day, entries]) => (
          <div key={day}>
            <h2 className="text-xs uppercase tracking-wide text-bsh-gold mb-3 sticky top-0 bg-bsh-black/95 py-1">
              {day}
            </h2>
            <div className="space-y-2">
              {entries.map((entry) => {
                const time = new Date(entry.date).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                );
                return (
                  <div
                    key={entry.hash}
                    className="border border-white/10 rounded-lg p-3 bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm">{entry.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-white/30 font-mono">
                          {time}
                        </span>
                        <span className="text-xs text-white/20 font-mono">
                          {entry.hash}
                        </span>
                      </div>
                    </div>
                    {entry.details && (
                      <pre className="text-xs text-white/50 mt-2 whitespace-pre-wrap font-sans">
                        {entry.details}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
