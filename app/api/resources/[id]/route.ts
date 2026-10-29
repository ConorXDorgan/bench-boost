import { NextResponse } from "next/server";
import { loadResourceDetail } from "@/lib/snapshotLoader";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const detail = await loadResourceDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
