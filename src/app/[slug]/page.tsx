import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { availableReceivingModes, canReceiveOrders } from "@/lib/order";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) return { title: "Cardápio não encontrado" };
  return {
    title: `${menu.config.name} — Cardápio`,
    description: menu.config.description || "Monte seu pedido e envie pelo WhatsApp.",
  };
}

export default async function EstablishmentHomePage({ params }: Props) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  const { config, meals } = menu;
  const cheapest = meals.length ? Math.min(...meals.map((m) => m.priceCents)) : null;
  const modes = availableReceivingModes(config);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream-50 sm:my-6 sm:min-h-0 sm:overflow-hidden sm:rounded-[2rem] sm:shadow-xl">
      <section className="relative h-[52dvh] min-h-[320px] w-full overflow-hidden bg-cocoa-900 sm:h-80">
        {config.heroUrl ? (
          <img src={config.heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-500 to-brand-700 text-8xl">{config.emoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa-900/90 via-cocoa-900/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="flex items-end gap-3">
            {config.logoUrl && (
              <img src={config.logoUrl} alt={config.name} className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/80 bg-white object-cover shadow-md" />
            )}
            <div>
              <h1 className="text-3xl font-extrabold leading-tight drop-shadow">{config.name}</h1>
              {config.description && <p className="mt-1 text-sm text-white/90">{config.description}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-4 px-5 pb-8 pt-5">
        {(config.openingDays || config.openingHours) && (
          <div className="flex flex-wrap gap-2 text-sm font-semibold text-cocoa-700">
            {config.openingDays && <span className="rounded-full bg-cream-100 px-3 py-1.5">📅 {config.openingDays}</span>}
            {config.openingHours && <span className="rounded-full bg-cream-100 px-3 py-1.5">🕐 {config.openingHours}</span>}
          </div>
        )}

        {canReceiveOrders(config) ? (
          <>
            <div className="rounded-3xl border border-cream-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-extrabold">Como funciona</p>
              <ol className="mt-2 space-y-1.5 text-[15px] text-cocoa-700">
                <li>1. Escolha e personalize seus itens</li>
                <li>2. Diga como quer receber</li>
                <li>3. Informe o pagamento</li>
                <li>4. Envie o pedido pelo WhatsApp</li>
              </ol>
              {cheapest !== null && <p className="mt-3 text-sm font-semibold text-leaf-600">A partir de {formatBRL(cheapest)}</p>}
              {modes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {modes.map((m) => (
                    <span key={m.mode} className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-cocoa-700">
                      {m.emoji} {m.label}
                    </span>
                  ))}
                </div>
              )}
              {config.pickupEnabled && config.pickupAddress && (
                <p className="mt-2 text-xs text-cocoa-500">📍 Retirada: {config.pickupAddress}</p>
              )}
              {(config.ownDeliveryEnabled || config.appDeliveryEnabled) && (
                <p className="mt-1 text-xs text-cocoa-500">
                  🛵 O valor da entrega é combinado pelo WhatsApp.
                  {config.deliveryAreas && <> Atendemos: {config.deliveryAreas}.</>}
                </p>
              )}
            </div>

            <Link href={`/${config.slug}/pedido`} className="btn-primary mt-auto w-full text-lg">
              Fazer meu pedido {config.emoji}
            </Link>
          </>
        ) : (
          <div className="mt-auto rounded-3xl border-2 border-dashed border-cream-300 bg-white p-6 text-center">
            <p className="text-4xl">😴</p>
            <p className="mt-2 text-xl font-extrabold">No momento não estamos recebendo pedidos.</p>
            {config.pausedMessage && <p className="mt-2 text-cocoa-700">{config.pausedMessage}</p>}
          </div>
        )}

        <p className="text-center text-xs text-cocoa-500">Sem cadastro. Você finaliza o pedido pelo WhatsApp.</p>
      </section>
    </main>
  );
}
