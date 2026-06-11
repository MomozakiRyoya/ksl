import { NextResponse } from "next/server";
import { Resend } from "resend";
import { timingSafeEqual } from "crypto";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "KSL <noreply@kagoshimasuperleague.com>";

interface HookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: { display_name?: string; name?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "invite"
      | "email_change"
      | "magiclink";
    site_url: string;
  };
}

function verifyHookSecret(authHeader: string | null): boolean {
  const hookSecret = process.env.SUPABASE_HOOK_SECRET;
  if (!hookSecret) return true; // 未設定時はスキップ（開発環境）

  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);

  try {
    const expected = hookSecret.split(",")[1]?.trim() ?? hookSecret.trim();
    // タイミング安全な比較
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function buildVerifyUrl(payload: HookPayload): string {
  const { token_hash, email_action_type, redirect_to, site_url } =
    payload.email_data;

  // デバッグログ（トークン値は出力しない）
  console.log("[hook] email_action_type:", email_action_type);
  console.log("[hook] site_url:", site_url);
  console.log("[hook] redirect_to domain:", redirect_to ? new URL(redirect_to).hostname : "none");
  console.log("[hook] token_hash length:", token_hash?.length);

  if (email_action_type === "recovery") {
    // redirect_to と site_url は Supabase がワイルドカード等を渡すため使わない
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.kagoshimasuperleague.com"
    ).replace(/\/$/, "");
    const url = `${siteUrl}/auth/update-password?token_hash=${encodeURIComponent(token_hash)}&type=recovery`;
    console.log("[hook] recovery URL built (token omitted)");
    return url;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;
}

function signupHtml(verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#be185d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;padding:32px 0 24px;">
      <p style="margin:0;font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Kagoshima Super League</p>
      <h1 style="margin:8px 0 0;font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.02em;">メール確認</h1>
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#be185d;">FSLへようこそ！</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
        ご登録ありがとうございます。<br>
        下のボタンをクリックしてメールアドレスを確認し、アカウントを有効化してください。
      </p>
      <a href="${verifyUrl}"
        style="display:block;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;background:linear-gradient(135deg,#c9921e,#e3c060);color:#be185d;">
        メールアドレスを確認する
      </a>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
        このリンクは24時間有効です。<br>
        このメールに心当たりがない場合は無視してください。
      </p>
    </div>
    <p style="text-align:center;margin:20px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">
      &copy; 2026 Kagoshima Super League
    </p>
  </div>
</body>
</html>`;
}

function recoveryHtml(verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#be185d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;padding:32px 0 24px;">
      <p style="margin:0;font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Kagoshima Super League</p>
      <h1 style="margin:8px 0 0;font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.02em;">パスワード再設定</h1>
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#be185d;">パスワード再設定のご案内</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
        パスワード再設定のリクエストを受け付けました。<br>
        下のボタンをクリックして新しいパスワードを設定してください。
      </p>
      <a href="${verifyUrl}"
        style="display:block;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;background:linear-gradient(135deg,#c9921e,#e3c060);color:#be185d;">
        パスワードを再設定する
      </a>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
        このリンクは1時間有効です。<br>
        このメールに心当たりがない場合は無視してください。
      </p>
    </div>
    <p style="text-align:center;margin:20px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">
      &copy; 2026 Kagoshima Super League
    </p>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  // シークレット検証 - 失敗時は即401で拒否
  const authHeader = request.headers.get("Authorization");
  if (!verifyHookSecret(authHeader)) {
    console.warn("[send-email hook] Secret verification failed - request rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 必須フィールドのバリデーション
  const { user, email_data } = payload;
  if (!user?.id || !user?.email || typeof user.email !== "string") {
    return NextResponse.json({ error: "Missing required field: user.id or user.email" }, { status: 400 });
  }
  if (!email_data?.email_action_type || !email_data?.token_hash) {
    return NextResponse.json({ error: "Missing required field: email_data.email_action_type or token_hash" }, { status: 400 });
  }

  const verifyUrl = buildVerifyUrl(payload);

  const subjects: Record<string, string> = {
    signup: "【FSL】メールアドレスの確認",
    recovery: "【FSL】パスワード再設定",
    invite: "【FSL】招待のご案内",
    email_change: "【FSL】メールアドレス変更の確認",
    magiclink: "【FSL】ログインリンク",
  };

  const htmlMap: Record<string, string> = {
    signup: signupHtml(verifyUrl),
    recovery: recoveryHtml(verifyUrl),
  };

  const html = htmlMap[email_data.email_action_type] ?? signupHtml(verifyUrl);
  const subject =
    subjects[email_data.email_action_type] ?? "【FSL】アカウント確認";

  console.log("[send-email hook] FROM:", FROM);
  console.log("[send-email hook] TO:", user.email);
  console.log("[send-email hook] action_type:", email_data.email_action_type);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: emailData, error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error("[send-email hook] Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[send-email hook] Sent successfully:", emailData?.id);
  return NextResponse.json({});
}
