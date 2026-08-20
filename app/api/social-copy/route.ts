import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

// Même modèle que /api/carousel-story — un seul endroit à mettre à jour
// si le nom de modèle change un jour serait plus simple, mais on garde les
// deux routes indépendantes par design (voir CLAUDE.md du projet).
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

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

type RequestBody = MatchRecapBody | TopLeadersBody | TeamBreakdownBody;

const MATCH_RECAP_TOOL = {
  name: "generate_match_storyline",
  description:
    "Fournit une phrase d'accroche éditoriale pour un récap de match de basketball.",
  input_schema: {
    type: "object" as const,
    properties: {
      storyline: {
        type: "string",
        description:
          "Une phrase qui résume le sens du match (dynamique du score, performance décisive, retournement, etc.), 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), jamais générique.",
      },
    },
    required: ["storyline"],
  },
};

const TOP_LEADERS_TOOL = {
  name: "generate_leaderboard_insight",
  description:
    "Fournit une phrase d'accroche éditoriale pour un classement de statistiques de basketball.",
  input_schema: {
    type: "object" as const,
    properties: {
      insight: {
        type: "string",
        description:
          "Une phrase qui met en relief ce classement (écart en tête, régularité, nouveau nom qui monte, etc.), 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), jamais générique.",
      },
    },
    required: ["insight"],
  },
};

const TEAM_BREAKDOWN_TOOL = {
  name: "generate_team_breakdown_copy",
  description:
    "Fournit le texte d'accroche et de conclusion pour un carrousel Instagram d'analyse d'équipe de basketball.",
  input_schema: {
    type: "object" as const,
    properties: {
      hook: {
        type: "string",
        description:
          "Phrase d'accroche pour la première slide, 1 phrase, 140 caractères max, ton analyste sportif pro (façon ESPN/NBA), s'appuie sur un fait concret propre à cette équipe — jamais générique.",
      },
      outro: {
        type: "string",
        description:
          "Phrase de conclusion pour la dernière slide, 1 phrase, 160 caractères max, ton analyste sportif pro, qui synthétise la dynamique de l'équipe cette saison.",
      },
    },
    required: ["hook", "outro"],
  },
};

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
- Français, ton pro et direct, zéro cliché creux ("une équipe solide", "un collectif prometteur").
- Chaque phrase doit tenir dans les limites de caractères indiquées dans le schéma — sois concis.`;
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

  let prompt: string;
  let tool: typeof MATCH_RECAP_TOOL | typeof TOP_LEADERS_TOOL | typeof TEAM_BREAKDOWN_TOOL;
  let toolName: string;
  let outputKeys: string[];

  if (body.kind === "matchRecap") {
    if (!body.homeTeam || !body.awayTeam) {
      return NextResponse.json({ error: "Données de match incomplètes." }, { status: 400 });
    }
    prompt = buildMatchRecapPrompt(body);
    tool = MATCH_RECAP_TOOL;
    toolName = MATCH_RECAP_TOOL.name;
    outputKeys = ["storyline"];
  } else if (body.kind === "topLeaders") {
    if (!body.leaders?.length) {
      return NextResponse.json({ error: "Données de classement incomplètes." }, { status: 400 });
    }
    prompt = buildTopLeadersPrompt(body);
    tool = TOP_LEADERS_TOOL;
    toolName = TOP_LEADERS_TOOL.name;
    outputKeys = ["insight"];
  } else if (body.kind === "teamBreakdown") {
    if (!body.teamName) {
      return NextResponse.json({ error: "Données d'équipe incomplètes." }, { status: 400 });
    }
    prompt = buildTeamBreakdownPrompt(body);
    tool = TEAM_BREAKDOWN_TOOL;
    toolName = TEAM_BREAKDOWN_TOOL.name;
    outputKeys = ["hook", "outro"];
  } else {
    return NextResponse.json({ error: "Type de requête inconnu." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      tools: [tool],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      return NextResponse.json({ error: "Pas de réponse structurée du modèle." }, { status: 502 });
    }

    const input = toolUse.input as Record<string, string>;
    const output: Record<string, string> = {};
    outputKeys.forEach((key) => {
      output[key] = input[key];
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
