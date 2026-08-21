import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comparateur de joueurs — Basketball Haïti | BSH",
  description:
    "Compare deux joueurs de basketball des ligues haïtiennes SUBLE et AHBB : points, rebonds, passes, interceptions, contres.",
  openGraph: {
    title: "Comparateur de joueurs — Basketball Haïti | BSH",
    description:
      "Compare deux joueurs de basketball des ligues haïtiennes SUBLE et AHBB : points, rebonds, passes, interceptions, contres.",
  },
  twitter: {
    title: "Comparateur de joueurs — Basketball Haïti | BSH",
    description:
      "Compare deux joueurs de basketball des ligues haïtiennes SUBLE et AHBB : points, rebonds, passes, interceptions, contres.",
  },
};

export default function ComparateurLayout({ children }: { children: React.ReactNode }) {
  return children;
}
