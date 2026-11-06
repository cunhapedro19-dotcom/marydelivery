import { db } from "@/db";
import { images } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  if (rows.length === 0) notFound();
  const img = rows[0];
  // Buffer -> Blob (BodyInit válido para NextResponse)
  const body = new Blob([img.data], { type: img.mimeType });
  return new NextResponse(body, {
    headers: {
      "Content-Type": img.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}