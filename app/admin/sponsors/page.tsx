import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isOwnerEmail } from "@/lib/adminAccess";
import SponsorsManager from "./SponsorsManager";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isOwnerEmail(user?.email)) redirect("/admin");

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, slug, name")
    .order("name");

  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "sponsors_enabled")
    .single();

  return (
    <SponsorsManager
      initialSponsors={sponsors ?? []}
      leagues={leagues ?? []}
      initialEnabled={setting?.value === true}
    />
  );
}
