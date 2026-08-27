import { NextResponse } from "next/server";
import { generateStructuredCopy, type GeminiSchema } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

type RequestBody = {
  playerName: string;
  teamName: string | null;
  leagueName: string;
  competitionLabel: string;
  gamesPlayed: number | null;
  stats: { label: string; value: number | null; leagueAvg: number | null }[];
  rank: number | null;
  totalPlayers: number | null;
  strengthLabel: string | null;
  weaknessLabel: string | null;
};

const COPY_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    hook: {
      type: "STRING",
      description:
        "Texte d'accroche pour la slide 1 (ouverture), 1 à 2 phrases, 220 caractères max, ton analyste sportif pro (façon ESPN/NBA) mais écrit comme un humain qui suit vraiment la ligue — percutant et spécifique au joueur, jamais générique, jamais robotique.",
    },
    statsCaption: {
      type: "STRING",
      description:
        "Légende pour la slide 2 (grille de stats brutes), 1 à 2 phrases, 170 caractères max, met en relief le chiffre le plus parlant de la grille avec du contexte — jamais générique.",
    },
    comparisonCaption: {
      type: "STRING",
      description:
        "Légende pour la slide 3 (comparaison vs moyenne de la ligue), 1 à 2 phrases, 170 caractères max, souligne l'écart le plus frappant avec la moyenne et ce que ça dit du joueur — jamais générique.",
    },
    radarCaption: {
      type: "STRING",
      description:
        "Légende pour la slide 4 (profil radar forces/faiblesses), 1 à 2 phrases, 170 caractères max, commente le contraste entre le point fort et le point à travailler avec une vraie lecture du jeu — jamais générique.",
    },
    outro: {
      type: "STRING",
      description:
        "Texte de conclusion pour la slide 5 (dernière, slide de clôture centrée), 2 à 3 phrases, 320 caractères max, exactement le ton d'un analyste ESPN/NBA en fin de segment qui livre son verdict sur la saison du joueur — développé, précis, avec une vraie prise de position analytique, jamais une seule ligne sèche.",
    },
  },
  required: ["hook", "statsCaption", "comparisonCaption", "radarCaption", "outro"],
};

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY n'est pas configurée sur le serveur." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!body.playerName || !body.stats?.length) {
    return NextResponse.json({ error: "Données joueur incomplètes." }, { status: 400 });
  }

  const statsLines = body.stats
    .map((s) => `- ${s.label} : ${s.value ?? "n/a"} (moyenne ligue : ${s.leagueAvg?.toFixed(1) ?? "n/a"})`)
    .join("\n");

  const rankLine =
    body.rank != null && body.totalPlayers != null
      ? `Classement impact (PIR) dans la ligue : ${body.rank}e sur ${body.totalPlayers}.`
      : "";

  const prompt = `Tu es un analyste basketball professionnel qui écrit pour un média sportif haïtien (BSH / BallsoHard), dans le style d'une analyse ESPN ou NBA.com — précis, imagé, jamais générique, jamais de remplissage.

Joueur : ${body.playerName}
Équipe : ${body.teamName ?? "inconnue"}
Ligue : ${body.leagueName} — ${body.competitionLabel}
Matchs joués : ${body.gamesPlayed ?? "n/a"}
${rankLine}

Statistiques de la saison :
${statsLines}

Point fort relatif : ${body.strengthLabel ?? "n/a"}
Point à travailler : ${body.weaknessLabel ?? "n/a"}

Le carrousel Instagram a 5 slides. Écris un texte pour chacune :
1. Slide 1 (accroche d'ouverture) — donne envie de swiper, s'appuie sur un fait concret et spécifique à ce joueur (pas juste "il est bon").
2. Slide 2 (grille de stats brutes) — une légende courte qui met en avant le chiffre le plus parlant.
3. Slide 3 (comparaison vs moyenne de la ligue) — une légende courte sur l'écart le plus frappant avec la moyenne.
4. Slide 4 (profil radar forces/faiblesses) — une légende courte qui contraste le point fort et le point à travailler.
5. Slide 5 (conclusion, slide de clôture centrée) — écris comme un analyste ESPN/NBA qui livre son verdict final sur la saison du joueur : 2 à 3 phrases développées, qui résument ce qui définit sa saison avec une vraie prise de position analytique. C'est le texte le plus long et le plus travaillé des 5.

Contraintes strictes :
- N'utilise JAMAIS les mots "percentile" ou "PIR" dans le texte — dis "impact" à la place si besoin.
- Français, ton pro et direct, mais écrit comme un vrai commentateur passionné qui regarde les matchs — pas comme une IA qui résume des chiffres. Zéro cliché creux ("un joueur exceptionnel", "un talent brut"), zéro tournure toute faite.
- Développe un peu chaque idée (1 à 2 phrases) plutôt qu'une seule ligne sèche — reste dans les limites de caractères indiquées dans le schéma, mais utilise l'espace disponible.
- Les 5 textes doivent être distincts, ne répète pas la même idée d'une slide à l'autre.`;

  try {
    const output = await generateStructuredCopy(prompt, COPY_SCHEMA);
    return NextResponse.json({
      hook: output.hook,
      statsCaption: output.statsCaption,
      comparisonCaption: output.comparisonCaption,
      radarCaption: output.radarCaption,
      outro: output.outro,
    });
  } catch (err) {
    console.error("carousel-story generation failed", err);
    return NextResponse.json(
      { error: "Échec de la génération. Réessaie dans un instant." },
      { status: 502 }
    );
  }
}
