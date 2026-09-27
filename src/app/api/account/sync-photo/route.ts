import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { ownAvatarFileName, removeAvatarFiles } from "@/lib/avatar-storage";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 選手写真に書けるのは、本人が /api/account/avatar で保存した画像の URL だけ。
  // null は受け付けない（プロフィールを保存するたびに null が届き、管理者が登録した
  // 選手写真を消していた）。アバターの削除は DELETE /api/account/avatar が行い、
  // 本人の画像を指す選手写真もそこで外す
  const avatarFileName = ownAvatarFileName(admin, user.id, body.avatarUrl);
  if (!avatarFileName)
    return NextResponse.json({ error: "Invalid avatarUrl" }, { status: 400 });
  const avatarUrl: string = body.avatarUrl;

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

  const syncPlayer = async () => {
    // 優先度 1: user_metadata.player_id（持ち主を確認してから）
    const metaPlayerId = user.user_metadata?.player_id as string | undefined;
    if (metaPlayerId && (await ownsPlayer(metaPlayerId))) {
      const { error } = await admin
        .from("players")
        .update({ photo_url: avatarUrl })
        .eq("player_id", metaPlayerId);
      if (!error) return true;
    }

    // 優先度 2: body.playerId（持ち主を確認してから）
    const bodyPlayerId = body.playerId as string | undefined;
    if (bodyPlayerId && (await ownsPlayer(bodyPlayerId))) {
      const { error } = await admin
        .from("players")
        .update({ photo_url: avatarUrl })
        .eq("player_id", bodyPlayerId);
      if (!error) return true;
    }

    // 優先度 3: user.email で players.user_email を照合
    if (user.email) {
      const { error } = await admin
        .from("players")
        .update({ photo_url: avatarUrl })
        .eq("user_email", user.email);
      if (!error) return true;
    }
    return false;
  };
  const linked = await syncPlayer();

  // 差し替え前のアバターを消す。この API はアカウントのアバター（user_metadata）を
  // 新しい画像へ切り替えたあとに呼ばれ、選手写真も上で切り替えてある。
  // 失敗しても古い画像が残るだけなので、ログに留める
  const cleanupError = await removeAvatarFiles(admin, user.id, avatarFileName);
  if (cleanupError) console.error("[account/sync-photo]", cleanupError);

  return NextResponse.json(
    linked ? { ok: true } : { ok: false, reason: "no player linked" },
  );
}
