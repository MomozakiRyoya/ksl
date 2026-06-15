export const dynamic = "force-dynamic";
import {
  fetchPlayersFromSupabase,
  fetchTeamsFromSupabase,
} from "@/lib/supabase/queries";
import PlayersAdminClient from "./PlayersAdminClient";

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    fetchPlayersFromSupabase().catch(() => []),
    fetchTeamsFromSupabase().catch(() => []),
  ]);

  const clientPlayers = players.map((p) => ({
    id: p.id,
    name: p.name,
    teamId: p.teamId,
    teamName: p.teamName,
    leagueId: p.leagueId,
    number: p.number,
    photoUrl: p.photoUrl ?? null,
    isCaptain: p.isCaptain ?? false,
    userEmail: p.userEmail ?? null,
  }));

  return <PlayersAdminClient initialPlayers={clientPlayers} teams={teams} />;
}
