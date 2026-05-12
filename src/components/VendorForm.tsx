import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { RecordStatus } from "@/lib/status";
import { X } from "lucide-react";
import { Conditions } from "@/components/Conditions";

export type VendorRow = {
  id?: string;
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
};

const empty: VendorRow = {
  vendor_name: "", product_categories: [], phone: "", email: "", website: "",
  location: "", moq: "", price_range: "", supply_capacity: "", delivery_capacity: "",
  status: "follow_up", follow_up_date: "", conditions: "",
};

export function VendorForm({ open, onOpenChange, record, onSaved }: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  record?: VendorRow | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [r, setR] = useState<VendorRow>(empty);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setR(record ?? empty); }, [record, open]);
  const set = (patch: Partial<VendorRow>) => setR(prev => ({ ...prev, ...patch }));

  const addTag = () => {
    const t = tag.trim();
    if (t && !r.product_categories.includes(t)) set({ product_categories: [...r.product_categories, t] });
    setTag("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.product_categories.length) return toast.error("Add at least one product category");
    if (r.status === "follow_up" && !r.follow_up_date) return toast.error("Follow-up date required when status is Follow-up");
    if (!/^\d[\d\s\-+]{6,}$/.test(r.phone)) return toast.error("Enter a valid phone number");
    setBusy(true);
    const payload = {
      vendor_name: r.vendor_name.trim(),
      product_categories: r.product_categories,
      phone: r.phone.trim(),
      email: r.email || null,
      website: r.website || null,
      location: r.location.trim(),
      moq: r.moq || null,
      price_range: r.price_range || null,
      supply_capacity: r.supply_capacity || null,
      delivery_capacity: r.delivery_capacity || null,
      status: r.status,
      follow_up_date: r.follow_up_date || null,
      conditions: r.conditions || null,
    };
    const res = r.id
      ? await supabase.from("vendor_records").update(payload).eq("id", r.id)
      : await supabase.from("vendor_records").insert({ ...payload, created_by: user!.id });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(r.id ? "Vendor updated" : "Vendor added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{r.id ? "Edit vendor" : "New vendor"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Vendor name *</Label><Input required value={r.vendor_name} onChange={e => set({ vendor_name: e.target.value })} /></div>
          <div className="col-span-2">
            <Label>Product categories *</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={tag} onChange={e => setTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. Grains, Pulses, Spices" />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.product_categories.map(c => (
                <Badge key={c} variant="secondary" className="gap-1">
                  {c}
                  <button type="button" onClick={() => set({ product_categories: r.product_categories.filter(x => x !== c) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div><Label>Phone *</Label><Input required value={r.phone} onChange={e => set({ phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={r.email ?? ""} onChange={e => set({ email: e.target.value })} /></div>
          <div><Label>Website</Label><Input type="url" value={r.website ?? ""} onChange={e => set({ website: e.target.value })} /></div>
          <div><Label>Location *</Label><Input required value={r.location} onChange={e => set({ location: e.target.value })} /></div>
          <div><Label>MOQ</Label><Input value={r.moq ?? ""} onChange={e => set({ moq: e.target.value })} placeholder="e.g. 50 kg" /></div>
          <div><Label>Price range</Label><Input value={r.price_range ?? ""} onChange={e => set({ price_range: e.target.value })} placeholder="Rs 45–60/Kg" /></div>
          <div><Label>Supply capacity</Label><Input value={r.supply_capacity ?? ""} onChange={e => set({ supply_capacity: e.target.value })} placeholder="2 tons / month" /></div>
          <div><Label>Delivery capacity</Label><Input value={r.delivery_capacity ?? ""} onChange={e => set({ delivery_capacity: e.target.value })} placeholder="Pan-India, 5 day lead" /></div>
          <div>
            <Label>Status *</Label>
            <Select value={r.status} onValueChange={(v) => set({ status: v as RecordStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Follow-up date {r.status === "follow_up" && "*"}</Label>
            <Input type="date" value={r.follow_up_date ?? ""} onChange={e => set({ follow_up_date: e.target.value })} required={r.status === "follow_up"} />
          </div>
          <div className="col-span-2">
            <Conditions value={r.conditions ?? ""} onChange={v => set({ conditions: v })} />
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : r.id ? "Save changes" : "Add vendor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
