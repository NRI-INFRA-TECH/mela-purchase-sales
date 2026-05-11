import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/signup")({ component: Signup });

type RequestRole = "sales" | "purchase" | "executive_sales" | "executive_purchase";

const ROLE_OPTIONS: { value: RequestRole; label: string; desc: string }[] = [
  { value: "sales", label: "Sales Team", desc: "Onboard customers and track leads" },
  { value: "purchase", label: "Purchase Team", desc: "Onboard vendors and track sourcing" },
  { value: "executive_sales", label: "Manager — Sales", desc: "Oversee the entire Sales team" },
  { value: "executive_purchase", label: "Manager — Purchase", desc: "Oversee the entire Purchase team" },
];

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestRole, setRequestRole] = useState<RequestRole>("sales");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");

    const team: "sales" | "purchase" =
      requestRole === "executive_sales" || requestRole === "sales" ? "sales" : "purchase";
    const isExec = requestRole.startsWith("executive_");

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          requested_team: team,
          requested_executive: isExec,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    // Sign out immediately — they cannot use the app until approved
    await supabase.auth.signOut();
    toast.success("Application submitted");
    navigate({ to: "/pending-approval" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-secondary/30">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6"><BrandLogo size="md" /></div>
        <h2 className="font-display text-2xl font-bold">Apply for access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick your team. An admin will review and approve your request.
        </p>
        <form onSubmit={submit} className="space-y-5 mt-6">
          <div><Label htmlFor="n">Full name</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="e">Work email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>

          <div>
            <Label>Applying as</Label>
            <RadioGroup value={requestRole} onValueChange={(v) => setRequestRole(v as RequestRole)} className="mt-2 grid gap-2">
              {ROLE_OPTIONS.map(o => (
                <label key={o.value} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={o.value} id={`r-${o.value}`} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting…" : "Submit application"}</Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already approved? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
