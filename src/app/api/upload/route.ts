import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { images } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return Response.json({ error: "Arquivo ausente" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return Response.json({ error: "A foto precisa ter até 4 MB" }, { status: 400 });
  }
  const mimeType = ALLOWED.has(file.type) ? file.type : "image/jpeg";

  const id = randomBytes(12).toString("hex");
  const data = Buffer.from(await file.arrayBuffer());
  await db.insert(images).values({ id, establishmentId: session.establishmentId, mimeType, data });

  return Response.json({ url: `/api/imagens/${id}` });
}
