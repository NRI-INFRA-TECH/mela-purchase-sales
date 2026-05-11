export type RecordStatus = "accepted" | "follow_up" | "rejected";

export const STATUS_META: Record<RecordStatus, { label: string; classes: string; dot: string }> = {
  accepted: {
    label: "Accepted",
    classes: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  follow_up: {
    label: "Follow-up",
    classes: "bg-warning/20 text-[oklch(0.45_0.15_55)] border-warning/40",
    dot: "bg-warning",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};

export const STATUS_OPTIONS: RecordStatus[] = ["accepted", "follow_up", "rejected"];
