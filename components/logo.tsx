import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ inverted = false, onDark = false, className }: { inverted?: boolean; onDark?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md",
          inverted ? "bg-primary-foreground text-primary" : onDark ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <Snowflake className="size-5" aria-hidden />
      </span>
      <span className={cn("text-lg", onDark && "text-white")}>CoverWatch</span>
    </div>
  );
}
