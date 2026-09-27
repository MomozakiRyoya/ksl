import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import {
  IMAGE_FOLDERS,
  MAX_IMAGE_BYTES,
  imageExtension,
  type ImageFolder,
} from "@/lib/admin-image-upload";

// 他の管理APIと同じく、書き込みはサーバー側でサービスロールを使う
// （ブラウザから直接ストレージへ書くと RLS で弾かれる）
const BUCKET = "ksl-images";

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .includes(email);
}
async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email ?? "")) return null;
  return user;
}

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const user = await checkAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (
    typeof folder !== "string" ||
    !IMAGE_FOLDERS.includes(folder as ImageFolder)
  )
    return NextResponse.json({ error: "保存先が不正です" }, { status: 400 });
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

  const path = `${folder}/${Date.now()}.${ext}`;
  const admin = getAdmin();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[upload]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
