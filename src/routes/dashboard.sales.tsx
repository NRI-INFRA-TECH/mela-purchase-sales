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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Download, FileSpreadsheet, ChevronLeft, ChevronRight, MapPin, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sales")({ component: SalesPage });

const PAGE_SIZE = 10;

function SalesPage() {
  const { isAdmin, user, fullName } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const memberMap: Record<string, string> = Object.fromEntries((members ?? []).map(m => [m.id, m.full_name ?? ""]));
  // Non-admins don't load the members list, but they can still type their
  // own name expecting to see their records — patch it in.
  if (user?.id && fullName && !memberMap[user.id]) memberMap[user.id] = fullName;

  const filtered = applyFilters(
    data ?? [],
    filters,
    (r: any) =>
      [
        r.customer_name,
        r.company_name,
        r.phone,
        r.email,
        r.website,
        r.location,
        r.remarks,
        r.conditions,
        (r.categories ?? []).join(" "),
        memberMap[r.created_by],
      ]
        .filter(Boolean)
        .join(" "),
  );

  useEffect(() => { setPage(0); }, [filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportRows = () => filtered.map((r: any) => ({
    Company: r.company_name ?? "", Customer: r.customer_name,
    Categories: (r.categories ?? []).join("; "),
    Phone: r.phone, Email: r.email ?? "", Website: r.website ?? "",
    Location: r.location,
    Latitude: r.latitude ?? "", Longitude: r.longitude ?? "",
    ImageURL: r.image_url ?? "",
    Status: r.status, FollowUp: r.follow_up_date ?? "",
    Remarks: r.remarks ?? "", Conditions: r.conditions ?? "",
    AddedBy: memberMap[r.created_by] ?? "", AddedOn: r.created_at,
  }));
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("sales_records").delete().eq("id", id);
    if (error) { toast.error("Failed to delete record"); return; }
    toast.success("Customer record deleted");
    refetch();
  };

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
                <TableHead>Image</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Follow-up</TableHead>
                {isAdmin && <TableHead className="whitespace-nowrap">Added by</TableHead>}
                <TableHead>Added</TableHead>
                <TableHead className="w-20"></TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span>{r.location}</span>
                      {r.latitude != null && r.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${r.latitude}, ${r.longitude}`}
                          className="text-primary hover:text-primary/70"
                          onClick={e => e.stopPropagation()}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.image_url ? (
                      <a
                        href={r.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.follow_up_date ? format(new Date(r.follow_up_date), "d MMM yyyy") : "—"}</TableCell>
                  {isAdmin && <TableCell className="text-sm">{memberMap[r.created_by] ?? "—"}</TableCell>}
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "d MMM")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={deleting === r.id} onOpenChange={o => !o && setDeleting(null)}>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <strong>{r.customer_name}</strong> and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={isAdmin ? 13 : 12} className="text-center text-muted-foreground py-12">
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
