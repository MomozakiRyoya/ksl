import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  // Construct keys at runtime to bypass Turbopack static replacement of NEXT_PUBLIC_* vars
  const env = process.env as Record<string, string | undefined>;
  const supabaseUrl = env[["NEXT_PUBLIC", "SUPABASE", "URL"].join("_")] ?? "";
  const supabaseAnonKey =
    env[["NEXT_PUBLIC", "SUPABASE", "ANON", "KEY"].join("_")] ?? "";

  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background:
              "linear-gradient(160deg, #060b14 0%, #be185d 60%, #060b14 100%)",
          }}
        >
          <div className="w-8 h-8 border-2 border-white/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginForm
        supabaseUrl={supabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
      />
    </Suspense>
  );
}
