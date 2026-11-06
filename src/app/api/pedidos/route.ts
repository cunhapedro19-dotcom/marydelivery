import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, customerName, customerPhone, receivingMode, paymentName, subtotalCents, summary, message } = body;

    if (!slug || !customerName || !customerPhone || !receivingMode) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Busca o establishmentId pelo slug
    const { establishments } = await import("@/db/schema");
    const est = await db.select({ id: establishments.id }).from(establishments).where(eq(establishments.slug, slug)).limit(1);
    if (est.length === 0) {
      return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
    }

    await db.insert(orders).values({
      establishmentId: est[0].id,
      customerName,
      customerPhone,
      receivingMode,
      paymentName: paymentName || "",
      subtotalCents: subtotalCents || 0,
      summary: summary || "",
      message: message || "",
      done: false,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao registrar pedido:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}