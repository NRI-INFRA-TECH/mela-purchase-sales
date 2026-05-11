import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Store } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-secondary/30">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 font-display font-bold text-xl mb-6">
          <Store className="h-6 w-6 text-primary" /> BazarMela
        </div>
        <h2 className="font-display text-2xl font-bold">Create account</h2>
        <p className="text-sm text-muted-foreground mt-1">First user becomes admin automatically.</p>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div><Label htmlFor="n">Full name</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
