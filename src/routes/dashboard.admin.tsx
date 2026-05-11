import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin")({ component: Admin });

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Manage team members and roles.</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Team members</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTable /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTable() {
  const [busy, setBusy] = useState<string | null>(null);
  const { data, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, t] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
        supabase.from("user_teams").select("*"),
      ]);
      const profiles = p.data ?? [];
      const roles = r.data ?? [];
      const teams = t.data ?? [];
      return profiles.map((p: any) => ({
        ...p,
        roles: roles.filter((x: any) => x.user_id === p.id).map((x: any) => x.role),
        teams: teams.filter((x: any) => x.user_id === p.id).map((x: any) => x.team),
      }));
    },
  });

  const toggleTeam = async (uid: string, team: "sales" | "purchase", on: boolean) => {
    setBusy(uid + team);
    const res = on
      ? await supabase.from("user_teams").insert({ user_id: uid, team })
      : await supabase.from("user_teams").delete().match({ user_id: uid, team });
    setBusy(null);
    if (res.error) toast.error(res.error.message); else { toast.success("Updated"); refetch(); }
  };

  const toggleAdmin = async (uid: string, on: boolean) => {
    setBusy(uid + "admin");
    const res = on
      ? await supabase.from("user_roles").insert({ user_id: uid, role: "admin" })
      : await supabase.from("user_roles").delete().match({ user_id: uid, role: "admin" });
    setBusy(null);
    if (res.error) toast.error(res.error.message); else { toast.success("Role updated"); refetch(); }
  };

  const toggleActive = async (uid: string, on: boolean) => {
    setBusy(uid + "active");
    const res = await supabase.from("profiles").update({ is_active: on }).eq("id", uid);
    setBusy(null);
    if (res.error) toast.error(res.error.message); else { toast.success("Updated"); refetch(); }
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Sales</TableHead>
            <TableHead>Purchase</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((u: any) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><Switch checked={u.teams.includes("sales")} disabled={busy === u.id+"sales"} onCheckedChange={(v) => toggleTeam(u.id, "sales", v)} /></TableCell>
              <TableCell><Switch checked={u.teams.includes("purchase")} disabled={busy === u.id+"purchase"} onCheckedChange={(v) => toggleTeam(u.id, "purchase", v)} /></TableCell>
              <TableCell><Switch checked={u.roles.includes("admin")} disabled={busy === u.id+"admin"} onCheckedChange={(v) => toggleAdmin(u.id, v)} /></TableCell>
              <TableCell><Switch checked={u.is_active} disabled={busy === u.id+"active"} onCheckedChange={(v) => toggleActive(u.id, v)} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "d MMM yyyy")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* unused import safety */}
      <div className="hidden"><Badge /><Button /><StatusBadge status="accepted" /></div>
    </Card>
  );
}
