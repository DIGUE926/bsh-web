import { NextResponse } from "next/server";
import { generateStructuredCopy, type GeminiSchema } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

type MatchRecapBody = {
  kind: "matchRecap";
  leagueName: string;
  phase: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTop: { name: string; pts: number; reb: number; ast: number } | null;
  awayTop: { name: string; pts: number; reb: number; ast: number } | null;
};

type TopLeadersBody = {
  kind: "topLeaders";
  leagueName: string;
  competitionLabel: string;
  statLabel: string;
  topN: number;
  leaders: { name: string; team: string | null; value: number | null }[];
};

type TeamBreakdownBody = {
  kind: "teamBreakdown";
  teamName: string;
  leagueName: string;
  competitionLabel: string;
  wins: number;
  losses: number;
  ppg: number | null;
  oppg: number | null;
  diff: number | null;
  topPerformers: { name: string; ppg: number | null; pir: number | null }[];
};

type SeasonWrappedBody = {
  kind: "seasonWrapped";
  seasonLabel: string;
  leagueName: string;
  mvp: { name: string; team: string | null; pir: number | null };
  topScorer: { name: string; team: string | null; ppg: number | null };
  topPasser: { name: string; team: string | null; apg: number | null };
  topDefender: { name: string; team: string | null; value: number | null };
  dominantTeam: { name: string | null; wins: number; losses: number };
  chiffreChoc: { homeTeam: string; awayTeam: string; totalPoints: number } | null;
};

type RequestBody = MatchRecapBody | TopLeadersBody | TeamBreakdownBody | SeasonWrappedBody;

const MATCH_RECAP_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    storyline: {
      type: "STRING",
      description:
        "Une phrase qui résume le sens du match (dynamique du score, performance décisive, retournement, etc.), 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), jamais générique.",
    },
  },
  required: ["storyline"],
};

const TOP_LEADERS_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    insight: {
      type: "STRING",
      description:
        "Une phrase qui met en relief ce classement (écart en tête, régularité, nouveau nom qui monte, etc.), 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), jamais générique.",
    },
  },
  required: ["insight"],
};

const TEAM_BREAKDOWN_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    hook: {
      type: "STRING",
      description:
        "Texte d'accroche pour la première slide, 1 à 2 phrases, 220 caractères max, ton analyste sportif pro (façon ESPN/NBA) mais écrit comme un vrai commentateur, pas une IA — s'appuie sur un fait concret propre à cette équipe, jamais générique.",
    },
    outro: {
      type: "STRING",
      description:
        "Texte de conclusion pour la dernière slide, 1 à 2 phrases, 240 caractères max, ton analyste sportif pro, qui synthétise la dynamique de l'équipe cette saison avec une vraie prise de position.",
    },
  },
  required: ["hook", "outro"],
};

const SEASON_WRAPPED_SCHEMA: GeminiSchema = {
  type: "OBJECT",
  properties: {
    hook: {
      type: "STRING",
      description:
        "Texte d'accroche pour la slide de couverture du Wrapped BSH, 1 à 2 phrases, 220 caractères max, ton événementiel et impactant (façon récap de fin de saison ESPN/NBA) mais écrit comme un humain enthousiaste, pas une IA — donne envie de swiper, jamais générique.",
    },
    outro: {
      type: "STRING",
      description:
        "Texte de conclusion pour la dernière slide, 1 à 2 phrases, 240 caractères max, ton analyste sportif pro, qui résume l'esprit de la saison de cette ligue et invite à suivre la suite.",
    },
  },
  required: ["hook", "outro"],
};

function buildSeasonWrappedPrompt(body: SeasonWrappedBody): string {
  return `Tu es un analyste basketball professionnel qui écrit pour un média sportif haïtien (BSH / BallsoHard), dans le style d'un récap de fin de saison ESPN/NBA ("Wrapped"). Le carrousel couvre UNE seule ligue BSH : ${body.leagueName}.

Ligue : ${body.leagueName}
Saison : ${body.seasonLabel}
MVP saison (impact/PIR le plus haut) : ${body.mvp.name} (${body.mvp.team ?? "équipe inconnue"}), impact ${body.mvp.pir?.toFixed(1) ?? "n/a"}
Meilleur scoreur : ${body.topScorer.name} (${body.topScorer.team ?? "équipe inconnue"}), ${body.topScorer.ppg?.toFixed(1) ?? "n/a"} pts/match
Meilleur passeur : ${body.topPasser.name} (${body.topPasser.team ?? "équipe inconnue"}), ${body.topPasser.apg?.toFixed(1) ?? "n/a"} passes/match
Meilleur défenseur : ${body.topDefender.name} (${body.topDefender.team ?? "équipe inconnue"}), ${body.topDefender.value?.toFixed(1) ?? "n/a"} (interceptions+contres)/match
Équipe la plus dominante : ${body.dominantTeam.name ?? "n/a"} (${body.dominantTeam.wins}V-${body.dominantTeam.losses}D)
${body.chiffreChoc ? `Match le plus explosif : ${body.chiffreChoc.homeTeam} vs ${body.chiffreChoc.awayTeam}, ${body.chiffreChoc.totalPoints} points cumulés` : ""}

Écris :
1. Une phrase d'accroche pour la slide de couverture — donne le ton de "voici le récap de la saison BSH", excitant, sans lister les stats (elles arrivent dans les slides suivantes).
2. Une phrase de conclusion pour la dernière slide — résume l'esprit global de la saison de cette ligue, avec une vraie prise de position analytique.

Contraintes strictes :
- N'utilise JAMAIS les mots "percentile" ou "PIR" dans le texte — dis "impact" à la place si besoin.
- Français, ton pro et direct, mais écrit comme un vrai commentateur passionné qui a suivi la saison — pas comme une IA qui résume des stats. Zéro cliché creux, zéro tournure toute faite.
- Développe un peu chaque idée (1 à 2 phrases) plutôt qu'une seule ligne sèche — utilise l'espace disponible dans les limites de caractères du schéma.`;
}

function buildTeamBreakdownPrompt(body: TeamBreakdownBody): string {
  const perfLines = body.topPerformers
    .slice(0, 3)
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} — ${p.ppg != null ? `${p.ppg.toFixed(1)} pts/match` : "n/a"}${p.pir != null ? `, impact ${p.pir.toFixed(1)}` : ""}`
    )
    .join("\n");

  return `Tu es un analyste basketball professionnel qui écrit pour un média sportif haïtien (BSH / BallsoHard), dans le style d'une analyse ESPN ou NBA.com — précis, imagé, jamais générique, jamais de remplissage.

Équipe : ${body.teamName}
Ligue : ${body.leagueName} — ${body.competitionLabel}
Bilan : ${body.wins}V-${body.losses}D
Points marqués/match : ${body.ppg?.toFixed(1) ?? "n/a"}
Points encaissés/match : ${body.oppg?.toFixed(1) ?? "n/a"}
Différentiel : ${body.diff != null ? (body.diff >= 0 ? "+" : "") + body.diff.toFixed(1) : "n/a"}

Meilleurs joueurs de l'équipe cette saison :
${perfLines || "Pas de données individuelles disponibles."}

Écris :
1. Une phrase d'accroche pour la slide d'ouverture du carrousel — donne envie de swiper, s'appuie sur un fait concret et spécifique à cette équipe (bilan, dynamique, style de jeu suggéré par les chiffres).
2. Une phrase de conclusion pour la dernière slide — résume ce qui définit la saison de cette équipe, avec une vraie prise de position analytique.

Contraintes strictes :
- N'utilise JAMAIS les mots "percentile" ou "PIR" dans le texte — dis "impact" à la place si besoin.
- Français, ton pro et direct, mais écrit comme un vrai commentateur passionné, pas une IA qui liste des chiffres. Zéro cliché creux ("une équipe solide", "un collectif prometteur"), zéro tournure toute faite.
- Développe un peu chaque idée (1 à 2 phrases) plutôt qu'une seule ligne sèche — utilise l'espace disponible dans les limites de caractères du schéma.`;
}

function buildMatchRecapPrompt(body: MatchRecapBody): string {
  const homeWon = (body.homeScore ?? 0) >= (body.awayScore ?? 0);
  const winner = homeWon ? body.homeTeam : body.awayTeam;
  const loser = homeWon ? body.awayTeam : body.homeTeam;
  const margin = Math.abs((body.homeScore ?? 0) - (body.awayScore ?? 0));

  const perfLines = [
    body.homeTop
      ? `- ${body.homeTop.name} (${body.homeTeam}) : ${body.homeTop.pts} pts, ${body.homeTop.reb} reb, ${body.homeTop.ast} ast`
      : null,
    body.awayTop
      ? `- ${body.awayTop.name} (${body.awayTeam}) : ${body.awayTop.pts} pts, ${body.awayTop.reb} reb, ${body.awayTop.ast} ast`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Tu es un analyste basketball professionnel qui écrit pour un média sportif haïtien (BSH / BallsoHard), dans le style d'une analyse ESPN ou NBA.com — précis, imagé, jamais générique, jamais de remplissage.

Ligue : ${body.leagueName} — ${body.phase ?? "Saison régulière"}
Score final : ${body.homeTeam} ${body.homeScore ?? "-"} - ${body.awayScore ?? "-"} ${body.awayTeam}
Vainqueur : ${winner} (écart de ${margin} points sur ${loser})

Top performers :
${perfLines || "Pas de données de performance individuelle disponibles."}

Écris une phrase d'accroche éditoriale pour la slide de récap de ce match — donne le sens du résultat (écart serré, domination, performance individuelle décisive, etc.), pas juste "l'équipe X a gagné".

Contraintes strictes :
- Français, ton pro et direct, zéro cliché creux ("un match intense", "une belle victoire").
- Tient dans la limite de caractères indiquée dans le schéma — sois concis.`;
}

function buildTopLeadersPrompt(body: TopLeadersBody): string {
  const leaderLines = body.leaders
    .slice(0, 5)
    .map(
      (l, i) =>
        `${i + 1}. ${l.name}${l.team ? ` (${l.team})` : ""} — ${l.value ?? "n/a"}`
    )
    .join("\n");

  return `Tu es un analyste basketball professionnel qui écrit pour un média sportif haïtien (BSH / BallsoHard), dans le style d'une analyse ESPN ou NBA.com — précis, imagé, jamais générique, jamais de remplissage.

Ligue : ${body.leagueName} — ${body.competitionLabel}
Classement : ${body.statLabel}, Top ${body.topN}

Classement actuel :
${leaderLines}

Écris une phrase d'accroche éditoriale pour ce classement — appuie-toi sur un fait concret visible dans les chiffres (écart entre le 1er et le 2e, régularité en tête, nouveau nom qui monte, etc.), pas juste "voici le classement".

Contraintes strictes :
- N'utilise JAMAIS les mots "percentile" ou "PIR" dans le texte, même si la statistique classée est le PIR — dis "impact" à la place.
- Français, ton pro et direct, zéro cliché creux.
- Tient dans la limite de caractères indiquée dans le schéma — sois concis.`;
}

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

  let prompt: string;
  let schema: GeminiSchema;
  let outputKeys: string[];

  if (body.kind === "matchRecap") {
    if (!body.homeTeam || !body.awayTeam) {
      return NextResponse.json({ error: "Données de match incomplètes." }, { status: 400 });
    }
    prompt = buildMatchRecapPrompt(body);
    schema = MATCH_RECAP_SCHEMA;
    outputKeys = ["storyline"];
  } else if (body.kind === "topLeaders") {
    if (!body.leaders?.length) {
      return NextResponse.json({ error: "Données de classement incomplètes." }, { status: 400 });
    }
    prompt = buildTopLeadersPrompt(body);
    schema = TOP_LEADERS_SCHEMA;
    outputKeys = ["insight"];
  } else if (body.kind === "teamBreakdown") {
    if (!body.teamName) {
      return NextResponse.json({ error: "Données d'équipe incomplètes." }, { status: 400 });
    }
    prompt = buildTeamBreakdownPrompt(body);
    schema = TEAM_BREAKDOWN_SCHEMA;
    outputKeys = ["hook", "outro"];
  } else if (body.kind === "seasonWrapped") {
    if (!body.mvp?.name) {
      return NextResponse.json({ error: "Données de saison incomplètes." }, { status: 400 });
    }
    prompt = buildSeasonWrappedPrompt(body);
    schema = SEASON_WRAPPED_SCHEMA;
    outputKeys = ["hook", "outro"];
  } else {
    return NextResponse.json({ error: "Type de requête inconnu." }, { status: 400 });
  }

  try {
    const result = await generateStructuredCopy(prompt, schema);
    const output: Record<string, string> = {};
    outputKeys.forEach((key) => {
      output[key] = result[key];
    });
    return NextResponse.json(output);
  } catch (err) {
    console.error("social-copy generation failed", err);
    return NextResponse.json(
      { error: "Échec de la génération. Réessaie dans un instant." },
      { status: 502 }
    );
  }
}
