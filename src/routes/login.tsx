import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // Gate on profile.is_active — pending applicants cannot use the app
    const uid = data.user?.id;
    if (uid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", uid)
        .maybeSingle();
      if (!profile?.is_active) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Your access request is still pending admin approval.");
        navigate({ to: "/pending-approval" });
        return;
      }
    }

    setBusy(false);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <BrandLogo size="lg" className="[&_span]:text-primary-foreground" />
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-bold leading-tight">Run your<br/>marketplace ops<br/><span className="text-accent">with clarity.</span></h1>
          <p className="mt-6 max-w-md text-primary-foreground/80">A single dashboard for your Sales and Purchase teams — track every customer, every vendor, every follow-up.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">Internal use only · Confidential</p>
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 border-border/60">
          <div className="lg:hidden mb-6"><BrandLogo size="md" /></div>
          <h2 className="font-display text-2xl font-bold">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">Access your team dashboard.</p>
          <form onSubmit={submit} className="space-y-4 mt-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">Forgot password?</Link>
            </div>
          </form>
          <p className="mt-6 text-sm text-muted-foreground text-center">
            New to BazarMela? <Link to="/signup" className="text-primary font-medium hover:underline">Apply for access</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
