import { supabase } from "@/lib/supabase";
import { isSponsorsEnabled } from "@/lib/settings";

// Bandeau "Nos partenaires" en bas de la page d'accueil. Ne s'affiche que
// si le kill switch admin (/admin/sponsors) est activé ET qu'au moins un
// sponsor est marqué actif. Désactivé par défaut — voir lib/settings.ts.
export default async function SponsorsStrip() {
  const enabled = await isSponsorsEnabled();
  if (!enabled) return null;

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!sponsors || sponsors.length === 0) return null;

  return (
    <section className="mt-10 pt-6 border-t border-white/10">
      <p className="text-xs text-white/40 uppercase tracking-wide mb-3 text-center">
        Nos partenaires
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {sponsors.map((s) => {
          const content = s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logo_url}
              alt={s.name}
              className="h-8 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          ) : (
            <span className="text-sm font-semibold text-white/50 hover:text-white/80 transition-colors">
              {s.name}
            </span>
          );

          return s.website_url ? (
            <a
              key={s.id}
              href={s.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          ) : (
            <span key={s.id}>{content}</span>
          );
        })}
      </div>
    </section>
  );
}
