import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";
import TopLeadersGenerator from "./TopLeadersGenerator";

export default async function SocialToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/admin");

  return <TopLeadersGenerator />;
}
