export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  const adminEmails = process.env["ADMIN_EMAILS"] ?? "";
  const serviceRole = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

  return Response.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? `${url.slice(0, 20)}...` : "(empty)",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? `${key.slice(0, 10)}...` : "(empty)",
    ADMIN_EMAILS: adminEmails || "(empty)",
    SUPABASE_SERVICE_ROLE_KEY: serviceRole ? `${serviceRole.slice(0, 10)}...` : "(empty)",
  });
}
