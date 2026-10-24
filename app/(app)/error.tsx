"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/app/actions/errors";

// Friendly error screen for any page of the app; the error is recorded in the error log.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    logClientError(error.message, error.digest, pathname).catch(() => {});
  }, [error, pathname]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <AlertTriangle className="size-10 text-amber-600" aria-hidden />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        The error was recorded{error.digest && <> (reference {error.digest})</>}. Try again; if it keeps happening,
        use the Excel exports or the printable week view while it is fixed.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild><a href="/print/this-week">Printable week view</a></Button>
      </div>
    </div>
  );
}
