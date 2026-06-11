import { NextResponse } from "next/server";
import { filterContent } from "@/lib/content-filter";
import { Resend } from "resend";
import { createClient as createServerClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// サーバーレス環境では再起動のたびにリセットされるため、
// このレート制限は単一インスタンス内でのみ機能します。
// 本番環境では Redis/Upstash などの外部ストアへの移行を推奨します。
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 5; // 1分あたり5回まで

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimit.get(ip);

  if (!entry || entry.resetAt < now) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  // IP単位の簡易レート制限
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // content フィールドの型チェック
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }
  const { content } = body as Record<string, unknown>;
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  const check = filterContent(content);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  // DBに保存
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: dbError } = await supabase.from("feedback").insert({ content });
  if (dbError) {
    console.error("[feedback] DB insert error:", dbError.message);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  // メール送信（FEEDBACK_EMAIL 未設定でもクラッシュしない）
  const feedbackEmail = process.env.FEEDBACK_EMAIL?.trim();
  if (
    feedbackEmail &&
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== "re_placeholder"
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "FSL <onboarding@resend.dev>",
        to: feedbackEmail,
        subject: "【FSL】新しい意見箱への投稿",
        text: `新しい匿名フィードバックが届きました：\n\n${content}\n\n---\nFSL 匿名意見箱`,
      });
    } catch (emailErr) {
      // メール失敗してもDBに保存されているので続行
      console.warn("[feedback] Email send failed (non-fatal):", emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
