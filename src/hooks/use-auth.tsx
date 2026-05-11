import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "member";
type Team = "sales" | "purchase";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  teams: Team[];
  fullName: string;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fullName, setFullName] = useState("");

  const loadProfile = async (uid: string) => {
    const [r, t, p] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("user_teams").select("team").eq("user_id", uid),
      supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
    ]);
    setRoles((r.data ?? []).map((x: any) => x.role));
    setTeams((t.data ?? []).map((x: any) => x.team));
    setFullName(p.data?.full_name ?? "");
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else { setRoles([]); setTeams([]); setFullName(""); }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    isAdmin: roles.includes("admin"),
    teams,
    fullName,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (session?.user) await loadProfile(session.user.id); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
