export const dynamic = "force-dynamic";
import {
  fetchTeamsFromSupabase,
  fetchLeagueOptionsFromSupabase,
} from "@/lib/supabase/queries";
import TeamsAdminClient from "./TeamsAdminClient";

export default async function AdminTeamsPage() {
  const [teams, leagues] = await Promise.all([
    fetchTeamsFromSupabase().catch(() => []),
    fetchLeagueOptionsFromSupabase().catch(() => []),
  ]);
  return <TeamsAdminClient initialTeams={teams} leagues={leagues} />;
}
