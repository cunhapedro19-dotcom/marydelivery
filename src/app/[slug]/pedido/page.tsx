import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderBuilder from "@/components/order/OrderBuilder";
import { getPublicMenu } from "@/lib/data";
import { canReceiveOrders } from "@/lib/order";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  return { title: menu ? `Fazer pedido · ${menu.config.name}` : "Cardápio não encontrado" };
}

export default async function PedidoPage({ params }: Props) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();

  if (!canReceiveOrders(menu.config)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl">😴</p>
        <h1 className="mt-4 text-2xl font-extrabold">No momento não estamos recebendo pedidos.</h1>
        {menu.config.pausedMessage && <p className="mt-2 text-white/70">{menu.config.pausedMessage}</p>}
        <Link href={`/${menu.config.slug}`} className="btn-dark mt-8 w-full">
          Voltar ao início
        </Link>
      </main>
    );
  }

  return <OrderBuilder menu={menu} />;
}
