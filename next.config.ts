import type { NextConfig } from "next";

// Ces anciennes URLs globales (/playoffs, /classement) pointaient vers les données
// SUBLE avant la migration multi-ligue. On les redirige vers leurs équivalents
// /suble/... pour préserver les liens externes et l'indexation existants.
// Redirections temporaires (307) : à revoir si /playoffs et /classement doivent
// un jour devenir des pages de sélection de ligue plutôt que des alias de SUBLE.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/classement", destination: "/suble/classement-joueurs", permanent: false },
      {
        source: "/classement/:stat(ppg|rpg|apg|spg|bpg)",
        destination: "/suble/classement-joueurs/:stat",
        permanent: false,
      },
      { source: "/playoffs", destination: "/suble/playoffs", permanent: false },
      { source: "/playoffs/equipes", destination: "/suble/playoffs/equipes", permanent: false },
      { source: "/playoffs/classement", destination: "/suble/playoffs/classement", permanent: false },
      {
        source: "/playoffs/classement/:stat(ppg|rpg|apg|spg|bpg)",
        destination: "/suble/playoffs/classement/:stat",
        permanent: false,
      },
      { source: "/playoffs/:gameId", destination: "/suble/playoffs/:gameId", permanent: false },
    ];
  },
};

export default nextConfig;
