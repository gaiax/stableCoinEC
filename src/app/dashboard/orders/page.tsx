import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardOrderList } from '@/components/DashboardOrderList';

export const dynamic = 'force-dynamic';

export default async function DashboardOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  if (session.user.role !== 'SELLER') {
    redirect('/');
  }

  // ユーザーのショップを取得
  const shop = await prisma.shop.findFirst({
    where: { ownerId: session.user.id },
  });

  if (!shop) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">注文管理</h2>
        <p className="text-muted-foreground">ショップがまだ作成されていません。</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { product: { shopId: shop.id } },
    include: {
      product: true,
      shippingAddress: true,
      buyer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // BigInt / Decimal のシリアライズ
  const serializedOrders = orders.map((o) => ({
    ...o,
    amountPaid: o.amountPaid.toString(),
    shippingFee: o.shippingFee.toString(),
    shippedAt: o.shippedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    buyer: o.buyer ? { name: o.buyer.name, email: o.buyer.email } : null,
    product: {
      ...o.product,
      onChainProductId: o.product.onChainProductId?.toString() ?? null,
      priceJPYC: o.product.priceJPYC.toString(),
      createdAt: o.product.createdAt.toISOString(),
      updatedAt: o.product.updatedAt.toISOString(),
    },
    shippingAddress: o.shippingAddress
      ? {
          ...o.shippingAddress,
          createdAt: o.shippingAddress.createdAt.toISOString(),
        }
      : null,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">注文管理</h2>
        <a href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ダッシュボードに戻る
        </a>
      </div>
      <DashboardOrderList orders={serializedOrders} />
    </div>
  );
}
