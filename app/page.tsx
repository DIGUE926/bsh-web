import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

export default async function Home() {
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <h1 className="font-display text-5xl md:text-6xl text-bsh-orange mb-4 tracking-wide">
          BSH
        </h1>
        <p className="text-white/70 text-lg max-w-xl mx-auto">
          Basketball Stats Haïti — la plateforme officielle de statistiques
          multi-ligues.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl text-bsh-gold mb-6 tracking-wide">
          LIGUES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leagues?.map((league) => (
            <Link
              key={league.id}
              href={`/${league.slug}`}
              className="border border-white/10 rounded-lg p-6 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <h3 className="font-display text-xl">{league.name}</h3>
            </Link>
          ))}
          {(!leagues || leagues.length === 0) && (
            <p className="text-white/50">Aucune ligue trouvée pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
