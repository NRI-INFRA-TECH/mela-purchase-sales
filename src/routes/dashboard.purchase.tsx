import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { VendorForm, type VendorRow } from "@/components/VendorForm";
import { FilterBar, applyFilters, emptyFilters, type Filters } from "@/components/FilterBar";
import { Plus, Pencil, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";

export const Route = createFileRoute("/dashboard/purchase")({ component: PurchasePage });

function PurchasePage() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const { data, refetch } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_records").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members"], enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name")).data ?? [],
  });
  const memberMap = Object.fromEntries((members ?? []).map(m => [m.id, m.full_name]));

  const filtered = applyFilters(data ?? [], filters, (r: any) => `${r.vendor_name} ${r.phone} ${r.location} ${(r.product_categories ?? []).join(" ")}`);

  const exportRows = () => filtered.map((r: any) => ({
    Company: r.company_name ?? "", Vendor: r.vendor_name, Categories: (r.product_categories ?? []).join("; "), Phone: r.phone,
    Email: r.email ?? "", Website: r.website ?? "", Location: r.location, MOQ: r.moq ?? "",
    PriceRange: r.price_range ?? "", Supply: r.supply_capacity ?? "", Delivery: r.delivery_capacity ?? "",
    Status: r.status, FollowUp: r.follow_up_date ?? "", AddedBy: memberMap[r.created_by] ?? "", AddedOn: r.created_at,
  }));
  const stamp = new Date().toISOString().slice(0,10);
  const exportCsv = () => downloadCsv(`vendors-${stamp}.csv`, exportRows());
  const exportXlsx = () => downloadXlsx(`vendors-${stamp}.xlsx`, exportRows(), "Vendors");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Purchase · Vendors</h1>
          <p className="text-muted-foreground">{isAdmin ? "All vendor records across the team." : "Your vendor records."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!filtered.length}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New vendor</Button>
        </div>
      </div>

      <Card className="p-4">
        <FilterBar filters={filters} onChange={setFilters} members={isAdmin ? members : undefined} />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-up</TableHead>
              {isAdmin && <TableHead>Added by</TableHead>}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.company_name || "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.vendor_name}</div>
                  {r.price_range && <div className="text-xs text-muted-foreground">{r.price_range}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(r.product_categories ?? []).slice(0, 3).map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                    {(r.product_categories ?? []).length > 3 && <span className="text-xs text-muted-foreground">+{r.product_categories.length - 3}</span>}
                  </div>
                </TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-sm">{r.follow_up_date ? format(new Date(r.follow_up_date), "d MMM yyyy") : "—"}</TableCell>
                {isAdmin && <TableCell className="text-sm">{memberMap[r.created_by] ?? "—"}</TableCell>}
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-12">
                No vendors yet. Add your first vendor to get started.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <VendorForm open={open} onOpenChange={setOpen} record={editing} onSaved={refetch} />
    </div>
  );
}
