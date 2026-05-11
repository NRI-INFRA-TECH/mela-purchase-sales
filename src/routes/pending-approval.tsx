import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({ component: Pending });

function Pending() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-secondary/30">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4"><BrandLogo size="md" /></div>
        <div className="mx-auto h-14 w-14 rounded-full bg-warning/20 flex items-center justify-center mb-4">
          <Clock className="h-6 w-6 text-[oklch(0.45_0.15_55)]" />
        </div>
        <h2 className="font-display text-2xl font-bold">Awaiting approval</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Thanks for applying. Your access request has been submitted to the admin team.
          You'll be able to sign in once an admin approves it.
        </p>
        <Button asChild className="w-full mt-6">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </Card>
    </div>
  );
}
