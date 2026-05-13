import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Users, Truck, CheckCircle2, Clock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Overview() {
  const { isAdmin, fullName } = useAuth();

  const { data } = useQuery({
    queryKey: ["overview", isAdmin],
    queryFn: async () => {
      const [s, v, p] = await Promise.all([
        supabase.from("sales_records").select("status, follow_up_date, customer_name, created_at, created_by").order("created_at", { ascending: false }),
        supabase.from("vendor_records").select("status, follow_up_date, vendor_name, created_at, created_by").order("created_at", { ascending: false }),
        isAdmin ? supabase.from("profiles").select("id, full_name") : Promise.resolve({ data: [] }),
      ]);
      return { sales: s.data ?? [], vendors: v.data ?? [], profiles: p.data ?? [] };
    },
  });

  const sales = data?.sales ?? [];
  const vendors = data?.vendors ?? [];
  const profiles: { id: string; full_name: string }[] = data?.profiles ?? [];
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || "Unnamed"]));

  const all = [...sales.map(x => ({ ...x, kind: "sales" as const })), ...vendors.map(x => ({ ...x, kind: "vendor" as const }))];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const dueThisWeek = all.filter(x => x.status === "follow_up" && x.follow_up_date && new Date(x.follow_up_date) >= today && new Date(x.follow_up_date) <= weekEnd).length;
  const accepted = all.filter(x => x.status === "accepted").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}</h1>
        <p className="text-muted-foreground mt-1">{isAdmin ? "Team-wide overview across Sales and Purchase." : "Your activity summary."}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Sales records" value={sales.length} tone="primary" to="/dashboard/sales" />
        <KpiCard icon={Truck} label="Vendor records" value={vendors.length} tone="accent" to="/dashboard/purchase" />
        <KpiCard icon={CheckCircle2} label="Accepted" value={accepted} tone="success" to="/dashboard/sales" />
        <KpiCard icon={Clock} label="Follow-ups due (7d)" value={dueThisWeek} tone="warning" to="/dashboard/sales" />
      </div>

      <Card className="p-5">
        <h3 className="font-display font-semibold text-lg mb-4">Status breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusPanel label="Sales" rows={sales} profileMap={isAdmin ? profileMap : null} />
          <div className="hidden md:block w-px bg-border" />
          <StatusPanel label="Purchase / Vendors" rows={vendors} profileMap={isAdmin ? profileMap : null} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-semibold text-lg mb-4">Recent activity</h3>
        <div className="space-y-2">
          {all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8).map((r, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">{r.kind}</span>
                <span className="font-medium">{(r as any).customer_name ?? (r as any).vendor_name}</span>
                {isAdmin && profileMap[r.created_by] && (
                  <span className="text-xs text-muted-foreground ml-2">by {profileMap[r.created_by]}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status as any} />
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMM")}</span>
              </div>
            </div>
          ))}
          {!all.length && <p className="text-sm text-muted-foreground py-8 text-center">No records yet. Add your first one from Sales or Purchase.</p>}
        </div>
      </Card>
    </div>
  );
}

function StatusPanel({ label, rows, profileMap }: {
  label: string;
  rows: { status: string; created_by: string }[];
  profileMap: Record<string, string> | null;
}) {
  const total = rows.length;
  const counts = {
    accepted: rows.filter(r => r.status === "accepted"),
    follow_up: rows.filter(r => r.status === "follow_up"),
    rejected: rows.filter(r => r.status === "rejected"),
  };

  const byUser = (arr: { created_by: string }[]) => {
    if (!profileMap) return [];
    const m: Record<string, number> = {};
    for (const r of arr) {
      const name = profileMap[r.created_by] ?? "Unknown";
      m[name] = (m[name] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <StatusRow label="Accepted" arr={counts.accepted} total={total} color="bg-success" users={byUser(counts.accepted)} />
      <StatusRow label="Follow-up" arr={counts.follow_up} total={total} color="bg-warning" users={byUser(counts.follow_up)} />
      <StatusRow label="Rejected" arr={counts.rejected} total={total} color="bg-destructive" users={byUser(counts.rejected)} />
    </div>
  );
}

function StatusRow({ label, arr, total, color, users }: {
  label: string;
  arr: any[];
  total: number;
  color: string;
  users: [string, number][];
}) {
  const pct = total ? (arr.length / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{arr.length}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {users.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {users.map(([name, count]) => (
            <span key={name} className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
              {name} <span className="font-medium text-foreground">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone, to }: { icon: any; label: string; value: number; tone: "primary" | "accent" | "success" | "warning"; to: string }) {
  const map = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-[oklch(0.45_0.15_55)]",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[oklch(0.45_0.15_55)]",
  };
  return (
    <Link to={to} className="block group">
      <Card className="p-5 transition-shadow group-hover:shadow-md cursor-pointer">
        <div className={`h-10 w-10 rounded-lg ${map[tone]} flex items-center justify-center mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-3xl font-display font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </Card>
    </Link>
  );
}
