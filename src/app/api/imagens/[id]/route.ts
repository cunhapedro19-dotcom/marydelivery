import { eq } from "drizzle-orm";
import { db } from "@/db";
import { images } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response("Não encontrado", { status: 404 });

  const [image] = await db.select().from(images).where(eq(images.id, id)).limit(1);
  if (!image) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
