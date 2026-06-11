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

function raw(d: Record<string, unknown>) {
  return {
    id: d.id as string,
    imageUrl: d.image_url as string,
    playerName: (d.player_name as string) ?? "",
    teamName: (d.team_name as string) ?? "",
    orderNum: (d.order_num as number) ?? 0,
    isActive: (d.is_active as boolean) ?? true,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await checkAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const admin = getAdmin();

  const updates: Record<string, unknown> = {};
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
  if (body.playerName !== undefined) updates.player_name = body.playerName;
  if (body.teamName !== undefined) updates.team_name = body.teamName;
  if (body.orderNum !== undefined) updates.order_num = body.orderNum;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data, error } = await admin
    .from("featured_players")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  return NextResponse.json(raw(data as Record<string, unknown>));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await checkAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ error: `IDが無効です: ${id}` }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("featured_players")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[DELETE featured_player] error:", error.message, "id:", id);
    return NextResponse.json(
      { error: "削除失敗: " + error.message },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    console.error("[DELETE featured_player] 0 rows deleted, id:", id);
    return NextResponse.json(
      { error: `削除対象が見つかりません (id: ${id})` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
