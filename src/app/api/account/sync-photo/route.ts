import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // avatarUrl は string または null のみ許可
  const rawAvatarUrl = body.avatarUrl;
  if (
    rawAvatarUrl !== null &&
    rawAvatarUrl !== undefined &&
    typeof rawAvatarUrl !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid avatarUrl type" },
      { status: 400 },
    );
  }
  const avatarUrl: string | null =
    typeof rawAvatarUrl === "string" ? rawAvatarUrl : null;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 選手の持ち主かどうかは、管理画面で登録した players.user_email と本人のメールの一致だけで決める。
  // user_metadata.player_id と body.playerId は本人が自由に書き換えられる
  // （マイページの選手選択で任意の選手を指定できる）ので、それだけでは信用しない
  const ownsPlayer = async (playerId: string) => {
    if (!user.email) return false;
    const { data } = await admin
      .from("players")
      .select("user_email")
      .eq("player_id", playerId)
      .maybeSingle();
    return data?.user_email?.toLowerCase() === user.email.toLowerCase();
  };

  // 優先度 1: user_metadata.player_id（持ち主を確認してから）
  const metaPlayerId = user.user_metadata?.player_id as string | undefined;
  if (metaPlayerId && (await ownsPlayer(metaPlayerId))) {
    const { error } = await admin
      .from("players")
      .update({ photo_url: avatarUrl })
      .eq("player_id", metaPlayerId);
    if (!error) return NextResponse.json({ ok: true });
  }

  // 優先度 2: body.playerId（持ち主を確認してから）
  const bodyPlayerId = body.playerId as string | undefined;
  if (bodyPlayerId && (await ownsPlayer(bodyPlayerId))) {
    const { error } = await admin
      .from("players")
      .update({ photo_url: avatarUrl })
      .eq("player_id", bodyPlayerId);
    if (!error) return NextResponse.json({ ok: true });
  }

  // 優先度 3: user.email で players.user_email を照合
  if (user.email) {
    const { error } = await admin
      .from("players")
      .update({ photo_url: avatarUrl })
      .eq("user_email", user.email);
    if (!error) return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, reason: "no player linked" });
}
