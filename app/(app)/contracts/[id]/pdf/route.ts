import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens the contract PDF through a signed link valid for 60 seconds.
// Storage RLS decides whether the signed-in user may read it.
export async function GET(request: NextRequest, { params }: RouteContext<"/contracts/[id]/pdf">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase.from("contracts").select("pdf_path").eq("id", id).maybeSingle();
  if (!contract?.pdf_path) return new NextResponse("No PDF for this contract.", { status: 404 });

  const { data, error } = await supabase.storage.from("contract-pdfs").createSignedUrl(contract.pdf_path, 60);
  if (error || !data) return new NextResponse("You don't have access to this file.", { status: 403 });

  return NextResponse.redirect(data.signedUrl);
}
