import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toQueryString } from "@/lib/data/lists";

// Downloads the current list as .xlsx with the same filters as the screen.
export function ExportButton({ list, filters }: { list: string; filters: Record<string, string> }) {
  const qs = toQueryString(filters);
  return (
    <Button asChild variant="outline">
      <a href={`/export/${list}${qs ? `?${qs}` : ""}`} download>
        <FileSpreadsheet className="size-4" aria-hidden /> Export to Excel
      </a>
    </Button>
  );
}
