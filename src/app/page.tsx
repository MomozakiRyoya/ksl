import Link from "next/link";
import Image from "next/image";
import {
  getNews,
  getLeagues,
  getStandings,
  getRounds,
  getTeams,
} from "@/lib/data";
import AutoScroll from "@/components/ui/AutoScroll";
import { getLatestYouTubeVideo } from "@/lib/youtube";
import CountUp from "@/components/ui/CountUp";
import ScrollReveal from "@/components/ui/ScrollReveal";
import MyTeamsSection from "@/components/home/MyTeamsSection";
import TopScorers from "@/components/home/TopScorers";
import HomeNewsSection from "@/components/home/HomeNewsSection";
import MatchCountdown from "@/components/home/MatchCountdown";
import SponsorBanner from "@/components/home/SponsorBanner";
import StandingsSection from "@/components/home/StandingsSection";
import FeaturedPlayers from "@/components/home/FeaturedPlayers";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  const chars = name.replace(/[aeiou\s]/gi, "");
  return chars.slice(0, 2).toUpperCase();
}

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseAdmin: any = null;
  if (supabaseUrl && supabaseServiceKey) {
    try {
      supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
        supabaseUrl,
        supabaseServiceKey,
      );
    } catch (e) {
      console.error("[supabaseAdmin] init failed:", e);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let featuredData: any[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playerResultsData: any[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let teamsForStats: any[] | null = null;

  const [news, leagues, standings, rounds, teams, latestVideo] =
    await Promise.all([
      getNews(),
      getLeagues(),
      getStandings(),
      getRounds(),
      getTeams(),
      getLatestYouTubeVideo(),
    ]);

  if (supabaseAdmin) {
    try {
      const [fr, pr, ts] = await Promise.all([
        supabaseAdmin
          .from("featured_players")
          .select("id, image_url, player_name, team_name")
          .eq("is_active", true)
          .order("order_num")
          .order("created_at"),
        supabaseAdmin
          .from("player_results")
          .select("player_id, player_name, team_id, team_name, rank, points"),
        supabaseAdmin.from("teams").select("team_id, league_id"),
      ]);
      featuredData = fr.data;
      playerResultsData = pr.data;
      teamsForStats = ts.data;
    } catch (e) {
      console.error("[admin queries] fallback:", e);
    }
  }

  // player_results を直接集計して PlayerStats を構築
  const teamLeagueMap: Record<string, string> = {};
  for (const t of teamsForStats ?? []) {
    teamLeagueMap[t.team_id as string] = t.league_id as string;
  }
  type StatEntry = {
    playerName: string;
    teamId: string;
    teamName: string;
    totalPoints: number;
    games: number;
    itmCount: number;
  };
  const statsMap: Record<string, StatEntry> = {};
  for (const r of playerResultsData ?? []) {
    const playerName = (r.player_name as string) ?? "";
    const teamId = (r.team_id as string) ?? "";
    if (!playerName.trim()) continue;
    const key = `${playerName}::${teamId}`;
    if (!statsMap[key]) {
      statsMap[key] = {
        playerName,
        teamId,
        teamName: (r.team_name as string) ?? "",
        totalPoints: 0,
        games: 0,
        itmCount: 0,
      };
    }
    statsMap[key].totalPoints += (r.points as number) || 0;
    statsMap[key].games += 1;
    const rank = r.rank as number | null;
    if (rank !== null && rank <= 3) statsMap[key].itmCount += 1;
  }
  const playerStats = Object.values(statsMap)
    .map((s) => ({
      playerId: `${s.playerName}::${s.teamId}`,
      playerName: s.playerName,
      teamId: s.teamId,
      teamName: s.teamName,
      leagueId: teamLeagueMap[s.teamId] ?? "spade",
      goals: s.totalPoints,
      assists: s.games > 0 ? Math.round((s.itmCount / s.games) * 100) : 0,
      games: s.games,
      mvpCount: 0,
    }))
    .sort((a, b) => b.goals - a.goals);

  // player_nameで重複排除（DB上の重複行対策）
  const seenPlayerNames = new Set<string>();
  const featuredPlayers = (featuredData ?? [])
    .filter((d) => {
      const name = (d.player_name as string) ?? "";
      if (seenPlayerNames.has(name)) return false;
      seenPlayerNames.add(name);
      return true;
    })
    .map((d) => ({
      id: d.id as string,
      imageUrl: d.image_url as string,
      playerName: (d.player_name as string) ?? "",
      teamName: (d.team_name as string) ?? "",
    }));

  // ヒーロー統計
  const teamCount = teams.length;
  const divisionCount = leagues.length;
  const maxRoundNumber =
    rounds.length > 0 ? Math.max(...rounds.map((r) => r.roundNumber)) : 0;
  const latestFinishedRound = rounds
    .filter((r) => r.status === "finished")
    .sort((a, b) => b.roundNumber - a.roundNumber)[0];

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto">
      {/* ヒーローセクション */}
      {/* 背景は桜島の水彩画。白地の絵なので紙色の上に乗算で重ね、ページの地色となじませる */}
      {/* 絵は全幅で下端へ置く。噴煙が右にあるので、文字は左の空に載せる */}
      {/* スマホは噴煙が3つ目の統計（節）に掛かるので、絵を右へ 2.5rem ずらす（右端の木が少し切れる） */}
      <section className="relative flex flex-col overflow-hidden animate-fade-in bg-[#f5f3ee] lg:aspect-[2/1]">
        <div className="absolute bottom-0 left-10 -right-10 aspect-[2/1] lg:left-0 lg:right-0">
          <Image
            src="/ksl-hero-sakurajima.jpg"
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 896px, (min-width: 512px) 512px, 100vw"
            className="object-cover mix-blend-multiply"
          />
        </div>

        {/* コンテンツ（スマホは絵の高さ＝幅の半分から、空に重ねる分を引いて下を空ける） */}
        <div className="relative px-6 pt-10 pb-[calc(50%-4.5rem)] text-[#0d0010] lg:px-12 lg:pt-12 lg:pb-0">
          <h1 className="text-3xl font-black tracking-wide mb-0.5">
            KAGOSHIMA
          </h1>
          <h1 className="text-3xl font-black tracking-wide mb-2">
            SUPER LEAGUE
          </h1>
          <p className="text-[#0d0010]/60 text-xs tracking-[0.2em] mb-6 uppercase">
            すべてを、背負え。
          </p>

          <div className="flex items-center gap-6">
            <div>
              <p className="stat-number">
                <CountUp value={teamCount} duration={4500} />
              </p>
              <p className="text-[#0d0010]/60 text-[11px] tracking-wide mt-1">
                チーム
              </p>
            </div>
            <div className="w-px h-8 bg-[#0d0010]/15" />
            <div>
              <p className="stat-number">
                <CountUp value={divisionCount} duration={3500} />
              </p>
              <p className="text-[#0d0010]/60 text-[11px] tracking-wide mt-1">
                ディビジョン
              </p>
            </div>
            <div className="w-px h-8 bg-[#0d0010]/15" />
            <div>
              <p className="stat-number">
                <CountUp value={maxRoundNumber} duration={4000} />
              </p>
              <p className="text-[#0d0010]/60 text-[11px] tracking-wide mt-1">
                節
              </p>
            </div>
          </div>

          {/* 最新節サブテキスト */}
          {latestFinishedRound && (
            <p className="text-[#0d0010]/60 text-[11px] mt-3 font-medium tracking-wide">
              最新節: {latestFinishedRound.name} 完了
            </p>
          )}
        </div>

        {/* リーグタブ（自動スクロール） */}
        <div className="relative mt-auto px-4 pb-4">
          <AutoScroll speed={22} startOffset={0}>
            {leagues
              .filter((league) => league.name !== "Premier League")
              .map((league) => (
                <Link
                  key={league.id}
                  href={`/standings?league=${league.id}`}
                  className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/85 border border-[#0d0010]/10 text-[#0d0010] hover:bg-white transition-colors whitespace-nowrap"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: league.color }}
                  />
                  {league.name}
                </Link>
              ))}
          </AutoScroll>
        </div>
      </section>

      <div className="px-4 py-6 space-y-8">
        {/* 1. 最新の総合順位 */}
        <ScrollReveal>
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">最新の総合順位</p>
              <Link
                href="/standings"
                className="text-xs font-semibold transition-colors"
                style={{ color: "#c9921e" }}
              >
                全順位 →
              </Link>
            </div>
            <StandingsSection leagues={leagues} standings={standings} />
          </section>
        </ScrollReveal>

        {/* 注目選手 */}
        {featuredPlayers.length > 0 && (
          <FeaturedPlayers players={featuredPlayers} />
        )}

        {/* 2. 直近の試合日程 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">直近の試合</p>
            <Link
              href="/schedule"
              className="text-xs font-semibold transition-colors"
              style={{ color: "#c9921e" }}
            >
              日程を全て見る →
            </Link>
          </div>
          <MatchCountdown rounds={rounds} leagues={leagues} />
        </section>

        {/* 3. マイチーム */}
        <MyTeamsSection teams={teams} standings={standings} news={news} />

        {/* 4. ニュース */}
        <ScrollReveal delay={50}>
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">ニュース</p>
            </div>
            <HomeNewsSection news={news} />
          </section>
        </ScrollReveal>

        {/* 5. プレイヤーポイントランキング */}
        <ScrollReveal delay={80}>
          <TopScorers playerStats={playerStats} />
        </ScrollReveal>

        {/* コミュニティ */}
        <section className="animate-spring-in">
          <p className="section-title mb-3">コミュニティ</p>
          <div className="grid grid-cols-1 gap-3">
            {/* 意見箱 */}
            <Link
              href="/feedback"
              className="card-native p-4 touch-active flex items-center gap-4"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #db2777, #2255a0)",
                }}
              >
                📮
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">匿名意見箱</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  運営への意見・要望を匿名で送れる
                </p>
              </div>
              <span className="text-xs text-slate-300">→</span>
            </Link>
          </div>
        </section>

        {/* YouTube セクション */}
        <section className="animate-spring-in animate-delay-300">
          <p className="section-title mb-3">公式動画</p>
          <a
            href={
              latestVideo?.url ??
              "https://youtube.com/@kagoshimasuperleague?si=Z6bdOsLAYOsrhgjY"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block card-native overflow-hidden touch-active"
          >
            <div className="relative bg-slate-900 aspect-video">
              {latestVideo ? (
                <>
                  <Image
                    src={latestVideo.thumbnail}
                    alt={latestVideo.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 to-slate-900" />
                  <div className="relative h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-white text-sm font-medium">
                      KSL 公式 YouTube
                    </p>
                    <p className="text-slate-300 text-xs">
                      試合ハイライト・インタビュー配信中
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-900 truncate">
                {latestVideo?.title ?? "KAGOSHIMA SUPER LEAGUE公式YouTube"}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                YouTube
              </span>
            </div>
          </a>
        </section>
      </div>
    </div>
  );
}
