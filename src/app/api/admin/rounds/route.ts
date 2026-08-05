import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

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

  const body = await request.json();
  const admin = getAdmin();

  const { data, error } = await admin
    .from("rounds")
    .insert({
      // rounds.id は uuid 型。`round-<timestamp>` のような文字列は
      // invalid input syntax for type uuid で INSERT が必ず失敗する
      id: crypto.randomUUID(),
      name: body.name ?? "",
      league_id: body.leagueId || null,
      league_name: body.leagueName ?? "",
      round_number: body.roundNumber ?? 0,
      // date は date 型。未入力時の "" は不正な値になるため null を入れる
      date: body.date || null,
      start_time: body.startTime || null,
      venue: body.venue ?? "",
      venue_url: body.venueUrl || null,
      status: body.status ?? "scheduled",
      is_playoff: body.isPlayoff ?? false,
      format: body.format ?? "",
      structure_id: body.structureId || null,
    })
    .select()
    .single();

  if (error || !data)
    return NextResponse.json(
      { error: `作成に失敗しました: ${error?.message ?? "unknown error"}` },
      { status: 500 },
    );
  revalidatePath("/schedule");
  revalidatePath("/");
  return NextResponse.json(data);
}
