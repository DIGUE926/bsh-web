import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/adminAccess";
import TeamsStaffEditor from "./TeamsStaffEditor";

export default async function EquipesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/admin");

  return <TeamsStaffEditor />;
}
