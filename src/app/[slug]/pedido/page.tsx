import { notFound } from "next/navigation";
import { getPublicMenu } from "@/lib/data";
import OrderBuilder from "@/components/order/OrderBuilder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function OrderPage({ params }: Props) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  return <OrderBuilder menu={menu} />;
}