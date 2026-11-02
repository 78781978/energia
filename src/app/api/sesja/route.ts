import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { user: user ? { role: user.role } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
