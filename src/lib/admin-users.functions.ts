import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  password: z.string().min(8),
  is_admin: z.boolean().default(false),
  teams: z.array(z.enum(["sales", "purchase"])).default(["sales"]),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Response("Forbidden: admin only", { status: 403 });
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      throw new Response(error?.message ?? "Failed to create user", { status: 400 });
    }

    const uid = created.user.id;

    // Active straight away (admin-created bypasses approval flow)
    await supabaseAdmin.from("profiles").update({ is_active: true }).eq("id", uid);

    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "member" }, { onConflict: "user_id,role" });
    }
    await supabaseAdmin.from("user_teams").delete().eq("user_id", uid);
    if (data.teams.length) {
      await supabaseAdmin.from("user_teams").insert(data.teams.map((team) => ({ user_id: uid, team })));
    }

    return { id: uid };
  });

export const approveAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: req, error } = await supabaseAdmin
      .from("access_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error || !req) throw new Response("Request not found", { status: 404 });
    if (req.status !== "pending") throw new Response("Request already reviewed", { status: 400 });

    const team = req.requested_team as "sales" | "purchase";
    const role = req.requested_executive
      ? (team === "sales" ? "executive_sales" : "executive_purchase")
      : "member";

    // Activate profile
    await supabaseAdmin.from("profiles").update({ is_active: true }).eq("id", req.user_id);

    // Wipe any prior role/team rows then assign requested ones
    await supabaseAdmin.from("user_roles").delete().eq("user_id", req.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: req.user_id, role });

    await supabaseAdmin.from("user_teams").delete().eq("user_id", req.user_id);
    await supabaseAdmin.from("user_teams").insert({ user_id: req.user_id, team });

    await supabaseAdmin
      .from("access_requests")
      .update({ status: "approved", reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.requestId);

    return { ok: true };
  });

export const rejectAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ requestId: z.string().uuid(), notes: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    await supabaseAdmin
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        notes: data.notes ?? null,
      })
      .eq("id", data.requestId);

    return { ok: true };
  });
