import { db } from "@/db";
import { orders, type ReceivingMode } from "@/db/schema";
import { getEstablishmentBySlug } from "@/lib/data";
import { canReceiveOrders } from "@/lib/order";

export const dynamic = "force-dynamic";

const MODES: ReceivingMode[] = ["pickup", "own", "app"];

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * Registra no painel do estabelecimento um pedido que o cliente está enviando pelo WhatsApp.
 * Nada é enviado automaticamente: o cliente confere a mensagem no WhatsApp e toca em enviar.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const slug = clip(body.slug, 60);
  const receivingMode = clip(body.receivingMode, 10) as ReceivingMode;
  const message = clip(body.message, 6000);
  if (!slug || !MODES.includes(receivingMode) || !message) {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const est = await getEstablishmentBySlug(slug);
  if (!est) return Response.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
  if (!canReceiveOrders(est)) return Response.json({ error: "Pedidos pausados" }, { status: 409 });

  const subtotal = Number(body.subtotalCents);
  await db.insert(orders).values({
    establishmentId: est.id,
    customerName: clip(body.customerName, 120),
    customerPhone: clip(body.customerPhone, 30),
    receivingMode,
    paymentName: clip(body.paymentName, 60),
    subtotalCents: Number.isFinite(subtotal) && subtotal >= 0 ? Math.round(subtotal) : 0,
    summary: clip(body.summary, 500),
    message,
  });

  return Response.json({ ok: true });
}
