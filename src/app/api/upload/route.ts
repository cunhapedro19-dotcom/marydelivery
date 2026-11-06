import { db } from "@/db";
import { images } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(); // Só admin logado pode subir imagem

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    // Validações básicas
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Apenas imagens" }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx. 2MB)" }, { status: 400 });

    // Processa com sharp: redimensiona para max 1200px, converte para JPEG qualidade 80
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const id = crypto.randomUUID();
    await db.insert(images).values({
      id,
      mimeType: "image/jpeg",
      data: processed,
    });

    return NextResponse.json({ id });
  } catch (err) {
    console.error("Erro no upload:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}