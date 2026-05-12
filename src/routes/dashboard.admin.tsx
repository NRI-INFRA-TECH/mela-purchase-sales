import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Truck, UserPlus, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { inviteUser, approveAccessRequest, rejectAccessRequest } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/dashboard/admin")({ component: Admin });

function Admin() {
  const { isAdmin, isElevated, loading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  if (loading) return null;
  if (!isElevated) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">Manage team members, roles, and access requests.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard/sales"><Users className="h-4 w-4 mr-2" /> Sales / Customers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/purchase"><Truck className="h-4 w-4 mr-2" /> Purchase / Vendors</Link>
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Add user</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "requests" : "users"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="requests">Access requests</TabsTrigger>}
          <TabsTrigger value="users">Team members</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <TabsContent value="requests" className="mt-4"><RequestsTable /></TabsContent>
        )}
        <TabsContent value="users" className="mt-4"><UsersTable addOpen={addOpen} setAddOpen={setAddOpen} /></TabsContent>
      </Tabs>
    </div>
  );
}

function RequestsTable() {
  const approveFn = useServerFn(approveAccessRequest);
  const rejectFn = useServerFn(rejectAccessRequest);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = async (id: string) => {
    setBusy(id);
    try { await approveFn({ data: { requestId: id } }); toast.success("Approved"); refetch(); }
    catch (e: any) { toast.error(e?.message ?? "Failed to approve"); }
    finally { setBusy(null); }
  };
  const reject = async (id: string) => {
    setBusy(id);
    try { await rejectFn({ data: { requestId: id } }); toast.success("Rejected"); refetch(); }
    catch (e: any) { toast.error(e?.message ?? "Failed to reject"); }
    finally { setBusy(null); }
  };

  const rows = data ?? [];

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Applying as</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => {
            const role = r.requested_executive
              ? (r.requested_team === "sales" ? "Manager — Sales" : "Manager — Purchase")
              : (r.requested_team === "sales" ? "Sales Team" : "Purchase Team");
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{role}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy")}</TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => reject(r.id)}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" disabled={busy === r.id} onClick={() => approve(r.id)}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Reviewed</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {!rows.length && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">
              No access requests yet.
            </TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function UsersTable({ addOpen, setAddOpen }: { addOpen: boolean; setAddOpen: (v: boolean) => void }) {
  const { isAdmin, isExecSales, isExecPurchase } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, t] = await Promise.all([
        supabase.from("profiles").select("*").eq("is_active", true).order("created_at"),
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

  const toggleRole = async (uid: string, role: "admin" | "executive_sales" | "executive_purchase", on: boolean) => {
    setBusy(uid + role);
    const res = on
      ? await supabase.from("user_roles").insert({ user_id: uid, role })
      : await supabase.from("user_roles").delete().match({ user_id: uid, role });
    setBusy(null);
    if (res.error) toast.error(res.error.message); else { toast.success("Role updated"); refetch(); }
  };

  const toggleActive = async (uid: string, on: boolean) => {
    setBusy(uid + "active");
    const res = await supabase.from("profiles").update({ is_active: on }).eq("id", uid);
    setBusy(null);
    if (res.error) toast.error(res.error.message); else { toast.success("Updated"); refetch(); }
  };

  // Exec users only see their own team's members
  const visible = (data ?? []).filter((u: any) => {
    if (isAdmin) return true;
    if (isExecSales) return u.teams.includes("sales");
    if (isExecPurchase) return u.teams.includes("purchase");
    return false;
  });

  return (
    <>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Purchase</TableHead>
              {isAdmin && <TableHead>Mgr Sales</TableHead>}
              {isAdmin && <TableHead>Mgr Purchase</TableHead>}
              {isAdmin && <TableHead>Admin</TableHead>}
              {isAdmin && <TableHead>Active</TableHead>}
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.vendor_name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.company_name || "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={u.teams.includes("sales")}
                    disabled={busy === u.id+"sales" || (!isAdmin && !isExecSales)}
                    onCheckedChange={(v) => toggleTeam(u.id, "sales", v)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.teams.includes("purchase")}
                    disabled={busy === u.id+"purchase" || (!isAdmin && !isExecPurchase)}
                    onCheckedChange={(v) => toggleTeam(u.id, "purchase", v)}
                  />
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Switch checked={u.roles.includes("executive_sales")} disabled={busy === u.id+"executive_sales"} onCheckedChange={(v) => toggleRole(u.id, "executive_sales", v)} />
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell>
                    <Switch checked={u.roles.includes("executive_purchase")} disabled={busy === u.id+"executive_purchase"} onCheckedChange={(v) => toggleRole(u.id, "executive_purchase", v)} />
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell>
                    <Switch checked={u.roles.includes("admin")} disabled={busy === u.id+"admin"} onCheckedChange={(v) => toggleRole(u.id, "admin", v)} />
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell>
                    <Switch checked={u.is_active} disabled={busy === u.id+"active"} onCheckedChange={(v) => toggleActive(u.id, v)} />
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "d MMM yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {isAdmin && <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refetch} />}
    </>
  );
}

function AddUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const invite = useServerFn(inviteUser);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "",
    is_admin: false, sales: true, purchase: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    const teams: ("sales" | "purchase")[] = [];
    if (form.sales) teams.push("sales");
    if (form.purchase) teams.push("purchase");
    if (!teams.length) return toast.error("Select at least one team");

    setBusy(true);
    try {
      await invite({ data: {
        full_name: form.full_name, email: form.email, password: form.password,
        is_admin: form.is_admin, teams,
      }});
      toast.success("User created");
      onCreated();
      onOpenChange(false);
      setForm({ full_name: "", email: "", password: "", is_admin: false, sales: true, purchase: false });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="n">Full name</Label>
            <Input id="n" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="p">Temporary password</Label>
            <Input id="p" type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Share with the user; they can change it after sign-in.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.sales} onCheckedChange={(v) => setForm({ ...form, sales: !!v })} /> Sales
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.purchase} onCheckedChange={(v) => setForm({ ...form, purchase: !!v })} /> Purchase
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_admin} onCheckedChange={(v) => setForm({ ...form, is_admin: !!v })} /> Admin
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
