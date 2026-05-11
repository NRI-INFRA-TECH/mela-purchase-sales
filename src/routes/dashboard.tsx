import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Truck, ShieldCheck, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({ component: DashboardLayout });

function DashboardLayout() {
  const { session, loading, isAdmin, fullName, signOut, teams } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const nav: { to: string; label: string; icon: any; show: boolean }[] = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, show: true },
    { to: "/dashboard/sales", label: "Sales / Customers", icon: Users, show: teams.includes("sales") || isAdmin },
    { to: "/dashboard/purchase", label: "Purchase / Vendors", icon: Truck, show: teams.includes("purchase") || isAdmin },
    { to: "/dashboard/admin", label: "Admin", icon: ShieldCheck, show: isAdmin },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-sidebar-border">
          <BrandLogo size="md" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.filter(n => n.show).map(n => {
            const active = n.to === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">{fullName || session.user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{isAdmin ? "Admin" : "Member"}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-sidebar border-b border-sidebar-border z-40 flex items-center justify-between px-4 h-14">
        <BrandLogo size="sm" />
        <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}><LogOut className="h-4 w-4" /></Button>
      </div>

      <main className="flex-1 min-w-0 md:ml-0 mt-14 md:mt-0">
        <div className="md:hidden flex gap-1 p-2 overflow-x-auto bg-card border-b">
          {nav.filter(n => n.show).map(n => (
            <Link key={n.to} to={n.to} className="text-xs px-3 py-1.5 rounded-full bg-secondary whitespace-nowrap">{n.label}</Link>
          ))}
        </div>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
