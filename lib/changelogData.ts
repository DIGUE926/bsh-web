// Généré à partir de l'historique Git — ne pas éditer à la main.
// Chaque entrée = un commit poussé sur le repo bsh-web.
export type ChangelogEntry = {
  hash: string;
  date: string; // ISO
  title: string;
  details: string | null;
};

export const changelogEntries: ChangelogEntry[] = [
  { hash: "1c4e2b8", date: "2026-08-14T21:47:46Z", title: "Ajout page changelog /admin/changelog - historique complet des MAJ du site", details: "- Genere a partir de l'historique Git (date/heure exactes de chaque commit, y compris les plus petits fixes)\n- Groupe par jour, affiche heure precise + hash court + description complete\n- lib/changelogData.ts contient un snapshot statique de tous les commits jusqu'a maintenant\n- Lien ajoute dans le menu de nav admin" },
  { hash: "3b8c469", date: "2026-08-14T21:42:45Z", title: "Ajout d'un vrai menu de navigation admin", details: "- Barre de nav persistante dans le layout admin : Matchs / Playoffs / Historique des modifs\n- Visible sur toutes les pages /admin/*, jamais côté public\n- Retrait des liens ad hoc devenus redondants (dashboard admin)" },
  { hash: "9307fbc", date: "2026-08-14T21:37:33Z", title: "Séparer Matchs (saison en cours) et Archives (saisons passées)", details: "- /[slug]/matchs : affiche uniquement la saison en cours, sans sélecteur\n- /[slug]/archives : nouvelle page dédiée, sélecteur de saisons passées uniquement (exclut la saison en cours)\n- Logique de calcul de saison centralisée dans lib/season.ts (juillet-juin)\n- Liste de matchs mutualisée dans app/[slug]/GamesList.tsx (réutilisée par Matchs et Archives)\n- Lien Archives du menu de nav pointe maintenant vers /[slug]/archives" },
  { hash: "c90167c", date: "2026-08-14T21:30:19Z", title: "Ajout du lien Archives dans le menu de navigation", details: "Ajouté sous chaque ligue dans le menu déroulant, mène à la page Matchs qui contient le filtre par saison" },
  { hash: "784f46e", date: "2026-08-14T21:25:28Z", title: "Rendre les noms de joueurs cliquables dans tous les classements", details: "- Classement global + PPG/RPG/APG/SPG/BPG : le nom du joueur devient un lien vers sa page individuelle\n- Fallback sûr : si player_id ou league_slug absents de la vue global_rankings, le nom reste en texte simple (pas de lien cassé)" },
  { hash: "811ba04", date: "2026-08-14T21:16:43Z", title: "Ajout archives par saison + graphique de tendance joueur", details: "- Page Matchs : filtre par saison (dérivé automatiquement de game_date, format YYYY-YYYY+1, saison basket juillet-juin). Aucune migration SQL nécessaire.\n- Page joueur : graphique de tendance PTS/REB/AST match par match (recharts), affiché seulement si au moins 2 matchs" },
  { hash: "2d14569", date: "2026-08-14T21:13:28Z", title: "Rendre le lien Historique des modifications plus discret", details: "Déplacé du bandeau du haut vers le bas de page, en petit texte peu visible" },
  { hash: "573abda", date: "2026-08-14T21:02:39Z", title: "Ajout historique des modifications (audit log) pour les stats", details: "- Nouvelle page /admin/historique listant insert/update/delete sur player_game_stats\n- Filtrable par joueur ou par match via query params\n- Affiche diff avant/après par champ, qui a fait le changement, quand\n- Lien depuis dashboard admin et depuis la page d'entrée de stats d'un match\n- Nécessite le script SQL sql_scripts/audit_log.sql (table + trigger) exécuté côté Supabase" },
  { hash: "4084f70", date: "2026-08-14T11:29:00Z", title: "feat: logos ligue + equipes SUBLE", details: "- Ajout des 6 logos (SUBLE + 5 equipes) dans public/logos/\n- Ajout logo_url au type League + affichage sur page d'accueil (cartes ligues), page ligue (header + menu deroulant nav)\n- Reutilise le composant Avatar existant (fallback initiales deja en place pour les equipes)" },
  { hash: "b7aaabe", date: "2026-08-14T10:57:58Z", title: "fix: classement - joueurs sans stats remontaient en 1ere position", details: "PostgREST met les valeurs NULL en premier par defaut sur un tri descendant.\nAjout de nullsFirst:false sur les 6 pages classement (PIR/PPG/RPG/APG/SPG/BPG)\net sur les leaders playoffs, pour que les joueurs sans stats enregistrees\ntombent bien en bas de liste au lieu de squatter le haut du classement." },
  { hash: "ac83bda", date: "2026-08-14T10:52:00Z", title: "feat: page accueil - distinction saison/playoffs + match du jour", details: "- Derniers resultats fusionne matchs saison + playoffs, tries par date, avec badge Saison/Playoffs sur chaque carte\n- Nouvelle section PLAYOFFS au-dessus des resultats: met en avant le match du jour (fuseau Haiti), ou le prochain match playoff a defaut\n- Lien 'Voir tous les matchs playoffs' vers /playoffs (bracket complet)" },
  { hash: "07ee88a", date: "2026-08-14T10:37:56Z", title: "feat: classement equipes playoffs (power rankings)", details: "- Nouvelle page /playoffs/equipes: bilan V-D, pourcentage victoire, points pour/contre, differentiel, serie en cours (streak)\n- Tri par win%, puis diff de points, puis points marques en tiebreaker\n- Badge 'Meilleur bilan playoffs' sur l'equipe #1, se met a jour automatiquement a chaque match joue\n- Repose sur la vue playoff_team_standings (SQL fourni separement)\n- Onglet Equipes ajoute dans la nav des 3 pages playoffs" },
  { hash: "0cb5b5c", date: "2026-08-14T01:48:45Z", title: "feat: espace playoffs SUBLE (bracket, box-scores, leaders, admin)", details: "- Nouvelles pages publiques /playoffs (bracket par tour), /playoffs/[gameId] (box-score), /playoffs/classement (leaders playoffs)\n- Nouvelles pages admin /admin/playoffs (liste), nouveau-match, saisie stats (même pattern que le flow saison régulière)\n- Repose sur les tables playoff_games / playoff_player_stats + vue playoff_player_totals (SQL fourni séparément)\n- Nav publique et dashboard admin mis à jour avec liens vers Playoffs" },
  { hash: "2bbdf26", date: "2026-08-13T00:38:51Z", title: "feat: onglets classement par stat (PPG/RPG/APG/SPG/BPG) + classement general sans afficher PIR", details: null },
  { hash: "4c2cee5", date: "2026-08-12T23:39:49Z", title: "feat: classement SUBLE avec PPG/RPG/APG/SPG/BPG, filtre league SUBLE", details: null },
  { hash: "5e113de", date: "2026-08-12T23:09:25Z", title: "fix: tie-break classement par differentiel de points", details: null },
  { hash: "61916fb", date: "2026-08-12T23:04:16Z", title: "fix: corriger structure JSX cassee dans NavMenu", details: null },
  { hash: "9c2555e", date: "2026-08-12T22:52:12Z", title: "Renommer Classement Global en Classement SUBLE", details: null },
  { hash: "c99d812", date: "2026-08-12T00:10:57Z", title: "fix: restore footer pinned to bottom, tighten spacing between border line and footer text", details: null },
  { hash: "b43b15c", date: "2026-08-12T00:02:33Z", title: "fix: remove forced full-viewport stretch causing large empty gap on short pages (mobile)", details: null },
  { hash: "a17b8d8", date: "2026-08-11T23:55:38Z", title: "fix: adjust court background sizing/position for mobile screens", details: null },
  { hash: "766cd18", date: "2026-08-11T23:29:05Z", title: "fix: dropdown option text invisible (white on white)", details: null },
  { hash: "c6b6d2d", date: "2026-08-11T04:46:12Z", title: "Ajoute espaces pour logos equipes et photos joueurs (placeholder initiales)", details: null },
  { hash: "b4ae87a", date: "2026-08-11T04:40:25Z", title: "Corrige chargement des polices Anton et Montserrat (jamais importees avant)", details: null },
  { hash: "f4a4a40", date: "2026-08-11T04:20:10Z", title: "Ajoute page 404 personnalisee aux couleurs BSH", details: null },
  { hash: "98ad7ab", date: "2026-08-11T04:11:40Z", title: "Remplace grille par plan de terrain de basket agrandi en fond", details: null },
  { hash: "2e82b1a", date: "2026-08-11T04:08:31Z", title: "Ajoute fond texture avec traces orange electriques sombres", details: null },
  { hash: "8815fb2", date: "2026-08-11T04:03:46Z", title: "Resserre le layout: espacements, tailles de texte et cartes plus denses, style ESPN", details: null },
  { hash: "c55ecbc", date: "2026-08-11T00:17:55Z", title: "Ajoute lien Instagram dans le menu deroulant BSH", details: null },
  { hash: "541a168", date: "2026-08-11T00:15:29Z", title: "Ajoute lien Instagram BSH dans le footer", details: null },
  { hash: "1216a5f", date: "2026-08-11T00:09:11Z", title: "Ajoute page joueur individuelle avec historique de matchs + nav mobile responsive", details: null },
  { hash: "a3b5fe3", date: "2026-08-11T00:04:16Z", title: "Transforme le logo BSH en menu deroulant avec navigation complete", details: null },
  { hash: "479afed", date: "2026-08-10T23:58:03Z", title: "Ajoute joueur du match, matchs a venir sur accueil, et fil breadcrumb", details: null },
  { hash: "36c194b", date: "2026-08-10T23:42:26Z", title: "Ajoute section derniers resultats sur la page d'accueil", details: null },
  { hash: "e7609f9", date: "2026-08-10T23:41:47Z", title: "Ajoute badge V-D sur cartes equipes et page equipe", details: null },
  { hash: "3eb2697", date: "2026-08-10T23:41:09Z", title: "Ajoute favicon et image de partage social BSH", details: null },
  { hash: "8604396", date: "2026-08-10T23:31:45Z", title: "Ajoute classement par ligue (V-D, pourcentage, +/-)", details: null },
  { hash: "b194d27", date: "2026-08-10T23:17:43Z", title: "Ajoute bouton retour global sur toutes les pages", details: null },
  { hash: "5549e1d", date: "2026-08-10T23:01:34Z", title: "Ajoute moyennes de saison (PPG/RPG/APG/SPG/TS%/PIR) sur page equipe", details: null },
  { hash: "85ff508", date: "2026-08-10T22:18:38Z", title: "Ajoute historique des matchs public + box score par match", details: null },
  { hash: "d8ca860", date: "2026-08-10T22:09:07Z", title: "Ajoute bouton suppression de match avec confirmation", details: null },
  { hash: "0d48187", date: "2026-08-10T22:05:01Z", title: "Ajoute lien retour vers dashboard apres sauvegarde des stats", details: null },
  { hash: "50c66db", date: "2026-08-10T21:45:07Z", title: "Interface admin protegee: connexion, creation match, saisie stats joueurs", details: null },
  { hash: "ca1bc4d", date: "2026-08-10T21:06:55Z", title: "Fix BSH branding: BallSoHard, pas Basketball Stats Haiti", details: null },
  { hash: "e41cc47", date: "2026-08-10T21:05:41Z", title: "Textes plus naturels, retrait des tirets cadratins", details: null },
  { hash: "e3c9bb4", date: "2026-08-10T18:05:04Z", title: "Setup initial: Next.js + Supabase + pages ligue/équipe/classement", details: null },
];
