import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";
import EquipesTabs from "./EquipesTabs";

export default async function EquipesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/admin");

  return <EquipesTabs />;
}
