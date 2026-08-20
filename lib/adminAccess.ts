// Sections réservées au compte principal (Digue), pas aux autres comptes admin
// (coachs) qui n'ont besoin que de la saisie de stats.
export const OWNER_EMAIL = "mpapincedric@gmail.com";

export function isOwnerEmail(email: string | null | undefined) {
  return email === OWNER_EMAIL;
}
