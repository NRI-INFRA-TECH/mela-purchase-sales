import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { SalesForm, type SalesRow } from "@/components/SalesForm";
import { FilterBar, applyFilters, emptyFilters, type Filters } from "@/components/FilterBar";
import { Plus, Pencil, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";

export const Route = createFileRoute("/dashboard/sales")({ component: SalesPage });

const PAGE_SIZE = 10;

function SalesPage() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesRow | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);

  const { data, refetch } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_records").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name")).data ?? [],
  });

  const memberMap = Object.fromEntries((members ?? []).map(m => [m.id, m.full_name]));

  const filtered = applyFilters(data ?? [], filters, (r: any) => `${r.customer_name} ${r.phone} ${r.location} ${r.email ?? ""}`);

  useEffect(() => { setPage(0); }, [filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportRows = () => filtered.map((r: any) => ({
    Company: r.company_name ?? "", Customer: r.customer_name,
    Categories: (r.categories ?? []).join("; "),
    Phone: r.phone, Email: r.email ?? "", Website: r.website ?? "",
    Location: r.location, Status: r.status, FollowUp: r.follow_up_date ?? "",
    Remarks: r.remarks ?? "", Conditions: r.conditions ?? "",
    AddedBy: memberMap[r.created_by] ?? "", AddedOn: r.created_at,
  }));
  const stamp = new Date().toISOString().slice(0, 10);
  const exportCsv = () => downloadCsv(`sales-${stamp}.csv`, exportRows());
  const exportXlsx = () => downloadXlsx(`sales-${stamp}.xlsx`, exportRows(), "Sales");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sales · Customers</h1>
          <p className="text-muted-foreground">{isAdmin ? "All customer leads across the team." : "Your customer leads."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!filtered.length}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New customer</Button>
        </div>
      </div>

      <Card className="p-4">
        <FilterBar filters={filters} onChange={setFilters} members={isAdmin ? members : undefined} />
      </Card>

      <Card className="w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Follow-up</TableHead>
                {isAdmin && <TableHead className="whitespace-nowrap">Added by</TableHead>}
                <TableHead>Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.company_name || "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customer_name}</div>
                    {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(r.categories ?? []).slice(0, 3).map((c: string) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {(r.categories ?? []).length > 3 && <span className="text-xs text-muted-foreground">+{(r.categories ?? []).length - 3}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.location}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.follow_up_date ? format(new Date(r.follow_up_date), "d MMM yyyy") : "—"}</TableCell>
                  {isAdmin && <TableCell className="text-sm">{memberMap[r.created_by] ?? "—"}</TableCell>}
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "d MMM")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground py-12">
                  No records match. Add your first customer to get started.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">{page + 1} / {totalPages}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <SalesForm open={open} onOpenChange={setOpen} record={editing} onSaved={refetch} />
    </div>
  );
}
