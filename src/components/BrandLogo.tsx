import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: "h-8 w-8", text: "text-base" },
  md: { box: "h-10 w-10", text: "text-lg" },
  lg: { box: "h-14 w-14", text: "text-2xl" },
};

export function BrandLogo({ size = "md", showWordmark = true, className }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg shadow-sm overflow-hidden",
          s.box,
        )}
        style={{ backgroundColor: "#FF4B00" }}
      >
        <img src={logoUrl} alt="BazarMela logo" className="h-full w-full object-contain p-1" />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold tracking-tight text-foreground", s.text)}>
          BazarMela
        </span>
      )}
    </div>
  );
}
