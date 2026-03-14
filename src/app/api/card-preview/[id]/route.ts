import { NextResponse } from "next/server";
import { getCachedCardById } from "@/lib/scryfall-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const card = await getCachedCardById(id);
    return NextResponse.json(card);
  } catch {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
}
