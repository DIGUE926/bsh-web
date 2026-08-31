import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";
import { sendPushToAll } from "@/lib/webpush";

export const dynamic = "force-dynamic";

// Annonce manuelle envoyée par Digue depuis /admin/notifications (playoffs,
// finale, champion de saison, etc. -- pas automatisable proprement comme
// "début de match" / "résultat final", donc bouton manuel plutôt qu'un
// trigger DB). Protégée par la session admin (owner uniquement), pas par le
// secret partagé -- c'est un appel navigateur authentifié, pas pg_net.
type AnnounceBody = {
  title: string;
  message: string;
  url?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let payload: AnnounceBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const title = payload.title?.trim();
  const message = payload.message?.trim();
  if (!title || !message) {
    return NextResponse.json({ error: "Titre et message requis." }, { status: 400 });
  }

  const result = await sendPushToAll({
    title,
    body: message,
    url: payload.url?.trim() || "/",
  });

  return NextResponse.json(result);
}
