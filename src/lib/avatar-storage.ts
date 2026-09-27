import type { SupabaseClient } from "@supabase/supabase-js";

// 一般ユーザーのアバターの置き場所。/api/account/avatar（保存・削除）と
// /api/account/sync-photo（選手写真への反映）が同じ規則を使うよう、ここにまとめる。
// admin にはサービスロールのクライアントを、userId には getUser() で確認済みの ID だけを渡す
export const AVATAR_BUCKET = "ksl-images";
const PAGE = 100;

export function avatarFolder(userId: string) {
  return `avatars/${userId}`;
}

// 本人フォルダの公開 URL の頭（末尾は /）
function folderUrl(admin: SupabaseClient, userId: string) {
  const {
    data: { publicUrl },
  } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(avatarFolder(userId));
  return `${publicUrl}/`;
}

// url が本人フォルダ直下の画像（/api/account/avatar が付ける <時刻>.<拡張子>）なら
// そのファイル名を返す。null・外部の URL・他人のフォルダは null
export function ownAvatarFileName(
  admin: SupabaseClient,
  userId: string,
  url: unknown,
): string | null {
  const prefix = folderUrl(admin, userId);
  if (typeof url !== "string" || !url.startsWith(prefix)) return null;
  const name = url.slice(prefix.length);
  return /^\d+\.[a-z]+$/.test(name) ? name : null;
}

// avatars/<userId>/ のファイルを keepName 以外すべて消す。
// 消す対象はこのフォルダの一覧から作り、クライアントからパスは受け取らない。
// 消す画像を指している選手写真（players.photo_url）は先に null へ戻す
// （途中で失敗しても、消えた画像を指す選手写真が残らない順番）。
// 失敗したら error.message を返す。成功なら null
export async function removeAvatarFiles(
  admin: SupabaseClient,
  userId: string,
  keepName?: string,
): Promise<string | null> {
  const folder = avatarFolder(userId);
  const bucket = admin.storage.from(AVATAR_BUCKET);

  const names: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(folder, { limit: PAGE, offset });
    if (error) return error.message;
    // id が null のものはフォルダ
    names.push(
      ...data
        .filter((f) => f.id !== null && f.name !== keepName)
        .map((f) => f.name),
    );
    if (data.length < PAGE) break;
  }

  const prefix = folderUrl(admin, userId);
  const unlink = admin
    .from("players")
    .update({ photo_url: null })
    .like("photo_url", `${prefix}%`);
  const { error: unlinkError } = await (keepName
    ? unlink.neq("photo_url", `${prefix}${keepName}`)
    : unlink);
  if (unlinkError) return unlinkError.message;

  for (let i = 0; i < names.length; i += PAGE) {
    const { error } = await bucket.remove(
      names.slice(i, i + PAGE).map((name) => `${folder}/${name}`),
    );
    if (error) return error.message;
  }
  return null;
}
