import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { MAX_IMAGE_BYTES, imageExtension } from "@/lib/admin-image-upload";
import {
  AVATAR_BUCKET,
  avatarFolder,
  removeAvatarFiles,
} from "@/lib/avatar-storage";

// ログイン中の本人のアバターを avatars/<user.id>/ に保存・削除する。
// ブラウザから直接ストレージへ書く・消すと RLS で弾かれるため、
// /api/admin/upload と同じく、本人確認のあとサービスロールで行う

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "ログインしてください" },
      { status: 401 },
    );

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "画像が選択されていません" },
      { status: 400 },
    );

  const ext = imageExtension(file.type);
  if (!ext)
    return NextResponse.json(
      { error: "JPEG、PNG、WebP 形式の画像のみアップロードできます" },
      { status: 400 },
    );
  if (file.size > MAX_IMAGE_BYTES)
    return NextResponse.json(
      { error: "ファイルサイズは 5MB 以内にしてください" },
      { status: 400 },
    );

  // 保存先はクライアントから受け取らず、確認済みの user.id だけで決める
  const path = `${avatarFolder(user.id)}/${Date.now()}.${ext}`;
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[account/avatar]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}

// 本人のアバターを消す。消すのは確認済みの user.id のフォルダだけで、
// パスはクライアントから受け取らない。本人の画像を指す選手写真も外す
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "ログインしてください" },
      { status: 401 },
    );

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const error = await removeAvatarFiles(admin, user.id);
  if (error) {
    console.error("[account/avatar]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
