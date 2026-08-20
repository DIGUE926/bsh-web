import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

// Modèle utilisé pour la génération de texte du carrousel joueur.
// Configurable via env var au cas où le nom de modèle doive être mis à jour.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

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

const COPY_TOOL = {
  name: "generate_carousel_copy",
  description:
    "Fournit le texte d'accroche et de conclusion pour un carrousel Instagram d'analyse basketball.",
  input_schema: {
    type: "object" as const,
    properties: {
      hook: {
        type: "string",
        description:
          "Phrase d'accroche pour la première slide, 1 phrase, 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), percutante et spécifique au joueur — jamais générique.",
      },
      outro: {
        type: "string",
        description:
          "Phrase de conclusion/résumé pour la dernière slide, 1 phrase, 160 caractères max, ton analyste sportif pro, qui synthétise l'impact du joueur cette saison.",
      },
    },
    required: ["hook", "outro"],
  },
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY n'est pas configurée sur le serveur." },
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

Écris :
1. Une phrase d'accroche pour la slide d'ouverture du carrousel Instagram — donne envie de swiper, s'appuie sur un fait concret et spécifique à ce joueur (pas juste "il est bon").
2. Une phrase de conclusion pour la dernière slide — résume ce qui définit sa saison, avec une vraie prise de position analytique.

Contraintes strictes :
- N'utilise JAMAIS les mots "percentile" ou "PIR" dans le texte.
- Français, ton pro et direct, zéro cliché creux ("un joueur exceptionnel", "un talent brut").
- Chaque phrase doit tenir dans les limites de caractères indiquées dans le schéma — sois concis.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      tools: [COPY_TOOL],
      tool_choice: { type: "tool", name: "generate_carousel_copy" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      return NextResponse.json({ error: "Pas de réponse structurée du modèle." }, { status: 502 });
    }

    const input = toolUse.input as { hook: string; outro: string };
    return NextResponse.json({ hook: input.hook, outro: input.outro });
  } catch (err) {
    console.error("carousel-story generation failed", err);
    return NextResponse.json(
      { error: "Échec de la génération. Réessaie dans un instant." },
      { status: 502 }
    );
  }
}
