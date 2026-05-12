import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import type { RecordStatus } from "@/lib/status";

const TEMPLATE_HEADERS = [
  "Company", "Vendor*", "Categories*", "Phone*", "Email", "Website",
  "Location*", "MOQ", "PriceRange", "Supply", "Delivery",
  "Status", "FollowUpDate", "Conditions",
];

const STATUS_VALUES = new Set(["accepted", "follow_up", "rejected"]);

type ParsedRow = {
  index: number;
  company_name: string | null;
  vendor_name: string;
  product_categories: string[];
  phone: string;
  email: string | null;
  website: string | null;
  location: string;
  moq: string | null;
  price_range: string | null;
  supply_capacity: string | null;
  delivery_capacity: string | null;
  status: RecordStatus;
  follow_up_date: string | null;
  conditions: string | null;
  errors: string[];
};

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseRows(raw: Record<string, unknown>[]): ParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];

    const vendor_name = cell(row, "Vendor*", "Vendor", "vendor_name", "VendorName");
    const phone = cell(row, "Phone*", "Phone", "phone");
    const location = cell(row, "Location*", "Location", "location");
    const categoriesRaw = cell(row, "Categories*", "Categories", "product_categories", "ProductCategories");
    const product_categories = categoriesRaw ? categoriesRaw.split(/[;,|]/).map(s => s.trim()).filter(Boolean) : [];
    const statusRaw = cell(row, "Status", "status").toLowerCase() || "follow_up";
    const status = STATUS_VALUES.has(statusRaw) ? (statusRaw as RecordStatus) : "follow_up";
    const follow_up_date = cell(row, "FollowUpDate", "FollowUp", "follow_up_date") || null;

    if (!vendor_name) errors.push("Vendor name required");
    if (!phone) errors.push("Phone required");
    if (!location) errors.push("Location required");
    if (!product_categories.length) errors.push("At least one category required");
    if (phone && !/^\d[\d\s\-+]{6,}$/.test(phone)) errors.push("Invalid phone");
    if (status === "follow_up" && !follow_up_date) errors.push("FollowUpDate required when status=follow_up");
    if (follow_up_date && !/^\d{4}-\d{2}-\d{2}$/.test(follow_up_date)) errors.push("FollowUpDate must be YYYY-MM-DD");
    if (!STATUS_VALUES.has(statusRaw) && statusRaw) errors.push(`Unknown status "${statusRaw}"`);

    return {
      index: i + 2,
      company_name: cell(row, "Company", "company_name", "CompanyName") || null,
      vendor_name,
      product_categories,
      phone,
      email: cell(row, "Email", "email") || null,
      website: cell(row, "Website", "website") || null,
      location,
      moq: cell(row, "MOQ", "moq") || null,
      price_range: cell(row, "PriceRange", "price_range", "Price") || null,
      supply_capacity: cell(row, "Supply", "supply_capacity", "SupplyCapacity") || null,
      delivery_capacity: cell(row, "Delivery", "delivery_capacity", "DeliveryCapacity") || null,
      status,
      follow_up_date,
      conditions: cell(row, "Conditions", "conditions") || null,
      errors,
    };
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["Spice Co", "Ravi Traders", "Spices; Pulses", "9876543210", "", "", "Mumbai, MH", "50 kg", "Rs 80–100/kg", "5 tons/mo", "Pan-India", "follow_up", "2026-06-01", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendors");
  XLSX.writeFile(wb, "vendor-upload-template.xlsx");
}

export function VendorBulkUpload({ open, onOpenChange, onUploaded }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const reset = () => { setRows([]); setFileName(""); if (fileRef.current) fileRef.current.value = ""; };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      setRows(parseRows(raw));
    };
    reader.readAsArrayBuffer(file);
  };

  const valid = rows.filter(r => r.errors.length === 0);
  const invalid = rows.filter(r => r.errors.length > 0);

  const upload = async () => {
    if (!valid.length) return;
    setBusy(true);
    const payload = valid.map(r => ({
      company_name: r.company_name,
      vendor_name: r.vendor_name,
      product_categories: r.product_categories,
      phone: r.phone,
      email: r.email,
      website: r.website,
      location: r.location,
      moq: r.moq,
      price_range: r.price_range,
      supply_capacity: r.supply_capacity,
      delivery_capacity: r.delivery_capacity,
      status: r.status,
      follow_up_date: r.follow_up_date,
      conditions: r.conditions,
      created_by: user!.id,
    }));
    const { error } = await supabase.from("vendor_records").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${valid.length} vendor${valid.length > 1 ? "s" : ""} uploaded`);
    reset();
    onOpenChange(false);
    onUploaded();
  };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk upload vendors</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose file
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {valid.length} valid
                </span>
                {invalid.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" /> {invalid.length} with errors
                  </span>
                )}
              </div>

              <div className="rounded-md border overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.index} className={r.errors.length ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground text-xs">{r.index}</TableCell>
                        <TableCell className="text-sm">{r.company_name || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{r.vendor_name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {r.product_categories.slice(0, 2).map(c => (
                              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                            {r.product_categories.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{r.product_categories.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.phone || "—"}</TableCell>
                        <TableCell className="text-sm">{r.location || "—"}</TableCell>
                        <TableCell className="text-sm capitalize">{r.status.replace("_", " ")}</TableCell>
                        <TableCell className="text-sm">{r.follow_up_date || "—"}</TableCell>
                        <TableCell>
                          {r.errors.length > 0 ? (
                            <span className="text-xs text-destructive">{r.errors.join("; ")}</span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {invalid.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Rows with errors will be skipped. Fix them in your file and re-upload, or proceed to import only the valid rows.
                </p>
              )}
            </div>
          )}

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file. Download the template above to see the required format.
              Categories can be separated by semicolons (e.g. <code className="text-xs bg-muted px-1 rounded">Spices; Pulses</code>).
              Status must be <code className="text-xs bg-muted px-1 rounded">accepted</code>, <code className="text-xs bg-muted px-1 rounded">follow_up</code>, or <code className="text-xs bg-muted px-1 rounded">rejected</code>.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={upload} disabled={!valid.length || busy}>
            {busy ? "Uploading…" : `Upload ${valid.length} vendor${valid.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
