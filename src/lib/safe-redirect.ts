/**
 * safe-redirect.ts
 *
 * Open-redirect 対策のためのリダイレクト先検証ユーティリティ。
 * 外部URLや改行コードを含むパス、プロトコル相対URLなどを弾き、
 * 安全な内部パスのみを返す。
 */

/**
 * リダイレクト先URLを検証して安全な値を返す。
 *
 * @param url - 検証するURL文字列
 * @param fallback - 不正な値の場合のフォールバックパス（デフォルト: "/"）
 * @returns 安全なリダイレクト先パス
 */
export function safeRedirect(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;

  // 改行コードを含む場合は拒否（HTTPレスポンス分割攻撃対策）
  if (url.includes("\n") || url.includes("\r")) return fallback;

  // プロトコル相対URL（//example.com）を拒否
  if (url.startsWith("//")) return fallback;

  // 絶対URLを拒否（外部サイトへのオープンリダイレクト対策）
  if (/^https?:\/\//i.test(url)) return fallback;

  // javascript: などのスキームを拒否
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return fallback;

  // 相対パス（"/"で始まらない）は拒否
  if (!url.startsWith("/")) return fallback;

  return url;
}
