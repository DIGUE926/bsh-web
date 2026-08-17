// Abrège un nom d'équipe long en gardant le premier mot (ex: "Fleurenceau Legends" -> "Fleurenceau")
// Utilisé dans les contextes compacts (cards de match sur mobile) pour éviter le débordement.
export function shortTeamName(name: string, maxLength = 14): string {
  if (name.length <= maxLength) return name;
  const firstWord = name.split(" ")[0];
  return firstWord.length <= maxLength ? firstWord : firstWord.slice(0, maxLength);
}
