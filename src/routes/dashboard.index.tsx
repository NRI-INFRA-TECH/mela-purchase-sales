import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Users, Truck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Overview() {
  const { isAdmin, fullName } = useAuth();

  const { data } = useQuery({
    queryKey: ["overview", isAdmin],
    queryFn: async () => {
      const [s, v] = await Promise.all([
        supabase.from("sales_records").select("status, follow_up_date, customer_name, created_at").order("created_at", { ascending: false }),
        supabase.from("vendor_records").select("status, follow_up_date, vendor_name, created_at").order("created_at", { ascending: false }),
      ]);
      return { sales: s.data ?? [], vendors: v.data ?? [] };
    },
  });

  const sales = data?.sales ?? [];
  const vendors = data?.vendors ?? [];
  const all = [...sales.map(x => ({ ...x, kind: "sales" as const })), ...vendors.map(x => ({ ...x, kind: "vendor" as const }))];

  const counts = {
    accepted: all.filter(x => x.status === "accepted").length,
    follow_up: all.filter(x => x.status === "follow_up").length,
    rejected: all.filter(x => x.status === "rejected").length,
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const dueThisWeek = all.filter(x => x.status === "follow_up" && x.follow_up_date && new Date(x.follow_up_date) >= today && new Date(x.follow_up_date) <= weekEnd).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}</h1>
        <p className="text-muted-foreground mt-1">{isAdmin ? "Team-wide overview across Sales and Purchase." : "Your activity summary."}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Sales records" value={sales.length} tone="primary" />
        <KpiCard icon={Truck} label="Vendor records" value={vendors.length} tone="accent" />
        <KpiCard icon={CheckCircle2} label="Accepted" value={counts.accepted} tone="success" />
        <KpiCard icon={Clock} label="Follow-ups due (7d)" value={dueThisWeek} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-display font-semibold text-lg mb-4">Status breakdown</h3>
          <div className="space-y-3">
            <Row label="Accepted" count={counts.accepted} total={all.length} color="bg-success" />
            <Row label="Follow-up" count={counts.follow_up} total={all.length} color="bg-warning" />
            <Row label="Rejected" count={counts.rejected} total={all.length} color="bg-destructive" />
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-lg mb-4">Recent activity</h3>
          <div className="space-y-2">
            {all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">{r.kind}</span>
                  <span className="font-medium">{(r as any).customer_name ?? (r as any).vendor_name}</span>
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
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "accent" | "success" | "warning" }) {
  const map = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-[oklch(0.45_0.15_55)]",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[oklch(0.45_0.15_55)]",
  };
  return (
    <Card className="p-5">
      <div className={`h-10 w-10 rounded-lg ${map[tone]} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-display font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function Row({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// XCircle import workaround
void XCircle;
