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

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Response("Forbidden: admin only", { status: 403 });

    // Create user with service role
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

    // handle_new_user trigger creates profile + default role/team. Adjust to match request.
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
    }
    // Reset teams to requested set
    await supabaseAdmin.from("user_teams").delete().eq("user_id", uid);
    if (data.teams.length) {
      await supabaseAdmin.from("user_teams").insert(data.teams.map((team) => ({ user_id: uid, team })));
    }

    return { id: uid };
  });
