// 管理画面の画像アップロードの規則。ブラウザ側の事前チェックと
// /api/admin/upload の検証が同じ規則を使うよう、ここにまとめる
// （形式とサイズの規則は /api/account/avatar も使う）
export const IMAGE_FOLDERS = ["teams", "players", "featured"] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

// 拡張子は file.type から決定（file.name に依存しない）。許可外の形式は null
export function imageExtension(mimeType: string): string | null {
  return IMAGE_EXTENSIONS.get(mimeType) ?? null;
}

export async function uploadAdminImage(
  file: File,
  folder: ImageFolder,
): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.url === "string") return { url: data.url };
    return { error: data.error ?? `HTTP ${res.status}` };
  } catch {
    return { error: "通信に失敗しました" };
  }
}
