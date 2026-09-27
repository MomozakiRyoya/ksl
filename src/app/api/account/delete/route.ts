import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { removeAvatarFiles } from "@/lib/avatar-storage";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

  // Admin clientでユーザー削除（RLSをバイパス）
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // アカウントより先に、本人のアバター画像（avatars/<user.id>/）を消す。
  // その画像を指す選手写真も外れる（退会者の写真を公開ページに残さない。運営確認済み）。
  // アカウントを消したあとでは本人が消し直せず、画像が公開されたまま残るので、
  // 失敗したら退会を止めてやり直してもらう（やり直しても残っている分を消すだけ）
  const avatarError = await removeAvatarFiles(admin, user.id);
  if (avatarError) {
    console.error("[account/delete]", avatarError);
    return NextResponse.json({ error: avatarError }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
