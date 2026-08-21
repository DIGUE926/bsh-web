import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isOwnerEmail } from "@/lib/adminAccess";
import LeagueRequestsList from "./LeagueRequestsList";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isOwnerEmail(user?.email)) redirect("/admin");

  const { data: requests } = await supabase
    .from("league_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return <LeagueRequestsList initialRequests={requests ?? []} />;
}
