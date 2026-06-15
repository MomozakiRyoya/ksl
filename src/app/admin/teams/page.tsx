export const dynamic = "force-dynamic";
import { fetchTeamsFromSupabase } from "@/lib/supabase/queries";
import TeamsAdminClient from "./TeamsAdminClient";

export default async function AdminTeamsPage() {
  const teams = await fetchTeamsFromSupabase().catch(() => []);
  return <TeamsAdminClient initialTeams={teams} />;
}
