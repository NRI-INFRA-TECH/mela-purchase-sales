import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { RecordStatus } from "@/lib/status";

export type Filters = {
  q: string;
  status: RecordStatus | "all";
  from: string;
  to: string;
  member: string; // user_id or "all"
};

export const emptyFilters: Filters = { q: "", status: "all", from: "", to: "", member: "all" };

export function FilterBar({
  filters, onChange, members,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  members?: { id: string; full_name: string }[];
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search by name, company, phone, location, added-by…" className="pl-9" />
      </div>
      <div className="w-36">
        <Select value={filters.status} onValueChange={(v) => set({ status: v as any })}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {members && (
        <div className="w-44">
          <Select value={filters.member} onValueChange={(v) => set({ member: v })}>
            <SelectTrigger><SelectValue placeholder="Team member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name || "Unnamed"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">From</label>
        <Input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className="w-40" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">To</label>
        <Input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className="w-40" />
      </div>
      <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilters)}><X className="h-4 w-4 mr-1" /> Clear</Button>
    </div>
  );
}

export function applyFilters<T extends { status: string; created_at: string; created_by: string }>(rows: T[], f: Filters, searchFields: (r: T) => string) {
  const rawNeedle = f.q.trim().toLowerCase();
  // Phone-friendly needle: when the search is dominated by digits, also
  // match against a digits-only projection of the haystack so users can
  // type "+91 98 76" or "98-76" and still hit "9876543210".
  const digitsNeedle = rawNeedle.replace(/\D/g, "");
  const useDigitsMatch = digitsNeedle.length >= 3;
  return rows.filter(r => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.member !== "all" && r.created_by !== f.member) return false;
    if (f.from && new Date(r.created_at) < new Date(f.from)) return false;
    if (f.to) {
      const end = new Date(f.to); end.setHours(23, 59, 59, 999);
      if (new Date(r.created_at) > end) return false;
    }
    if (!rawNeedle) return true;
    const haystack = searchFields(r).toLowerCase();
    if (haystack.includes(rawNeedle)) return true;
    if (useDigitsMatch && haystack.replace(/\D/g, "").includes(digitsNeedle)) return true;
    return false;
  });
}
