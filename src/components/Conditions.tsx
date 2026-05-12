import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Conditions({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>Conditions</Label>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Payment terms, delivery conditions, special agreements…"
        className="mt-1.5"
        disabled={disabled}
        maxLength={1000}
        rows={3}
      />
    </div>
  );
}
