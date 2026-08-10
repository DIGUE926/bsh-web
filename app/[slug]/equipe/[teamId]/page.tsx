import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { teamId } = await params;

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl text-bsh-orange mb-10 tracking-wide">
        {team.name}
      </h1>

      <h2 className="font-display text-xl text-bsh-gold mb-4 tracking-wide">
        ROSTER
      </h2>

      {players && players.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/20 text-white/50 text-sm uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Poste</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/60">
                    {p.jersey_number ?? "-"}
                  </td>
                  <td className="py-3 pr-4 font-semibold">{p.name}</td>
                  <td className="py-3 pr-4 text-white/60">
                    {p.position ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">Roster à venir.</p>
      )}
    </div>
  );
}
