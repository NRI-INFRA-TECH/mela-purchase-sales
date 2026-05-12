import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { RecordStatus } from "@/lib/status";
import { Conditions } from "@/components/Conditions";
import { X } from "lucide-react";

export type SalesRow = {
  id?: string;
  company_name: string | null;
  customer_name: string;
  categories: string[];
  phone: string;
  email: string | null;
  website: string | null;
  location: string;
  status: RecordStatus;
  follow_up_date: string | null;
  remarks: string | null;
  conditions: string | null;
};

const empty: SalesRow = {
  company_name: "", customer_name: "", categories: [], phone: "", email: "", website: "",
  location: "", status: "follow_up", follow_up_date: "", remarks: "", conditions: "",
};

export function SalesForm({ open, onOpenChange, record, onSaved }: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  record?: SalesRow | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [r, setR] = useState<SalesRow>(empty);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setR(record ?? empty); }, [record, open]);

  const set = (patch: Partial<SalesRow>) => setR(prev => ({ ...prev, ...patch }));

  const addTag = () => {
    const t = tag.trim();
    if (t && !r.categories.includes(t)) set({ categories: [...r.categories, t] });
    setTag("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (r.status === "follow_up" && !r.follow_up_date) {
      return toast.error("Follow-up date is required when status is Follow-up");
    }
    if (!/^\d[\d\s\-+]{6,}$/.test(r.phone)) return toast.error("Enter a valid phone number");
    setBusy(true);
    const payload = {
      company_name: r.company_name || null,
      customer_name: r.customer_name.trim(),
      categories: r.categories,
      phone: r.phone.trim(),
      email: r.email || null,
      website: r.website || null,
      location: r.location.trim(),
      status: r.status,
      follow_up_date: r.follow_up_date || null,
      remarks: r.remarks || null,
      conditions: r.conditions || null,
    };
    const res = r.id
      ? await supabase.from("sales_records").update(payload).eq("id", r.id)
      : await supabase.from("sales_records").insert({ ...payload, created_by: user!.id });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(r.id ? "Record updated" : "Customer added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{r.id ? "Edit customer" : "New customer lead"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Company name</Label><Input value={r.company_name ?? ""} onChange={e => set({ company_name: e.target.value })} className="mt-1.5" /></div>
          <div className="col-span-2"><Label>Customer name *</Label><Input required value={r.customer_name} onChange={e => set({ customer_name: e.target.value })} className="mt-1.5" /></div>
          <div className="col-span-2">
            <Label>Categories</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={tag} onChange={e => setTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. Retail, Wholesale, FMCG" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.categories.map(c => (
                <Badge key={c} variant="secondary" className="gap-1">
                  {c}
                  <button type="button" onClick={() => set({ categories: r.categories.filter(x => x !== c) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div><Label>Phone *</Label><Input required value={r.phone} onChange={e => set({ phone: e.target.value })} placeholder="9876543210" className="mt-1.5" /></div>
          <div><Label>Email</Label><Input type="email" value={r.email ?? ""} onChange={e => set({ email: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Website</Label><Input type="url" value={r.website ?? ""} onChange={e => set({ website: e.target.value })} placeholder="https://" className="mt-1.5" /></div>
          <div><Label>Location *</Label><Input required value={r.location} onChange={e => set({ location: e.target.value })} placeholder="City, State" className="mt-1.5" /></div>
          <div>
            <Label>Status *</Label>
            <Select value={r.status} onValueChange={(v) => set({ status: v as RecordStatus })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success"/>Accepted</span></SelectItem>
                <SelectItem value="follow_up"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning"/>Follow-up</span></SelectItem>
                <SelectItem value="rejected"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive"/>Rejected</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Follow-up date {r.status === "follow_up" && "*"}</Label>
            <Input type="date" value={r.follow_up_date ?? ""} onChange={e => set({ follow_up_date: e.target.value })} required={r.status === "follow_up"} className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label>Remarks</Label>
            <Textarea maxLength={500} value={r.remarks ?? ""} onChange={e => set({ remarks: e.target.value })} placeholder="Notes about the conversation…" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Conditions value={r.conditions ?? ""} onChange={v => set({ conditions: v })} />
          </div>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : r.id ? "Save changes" : "Add customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
