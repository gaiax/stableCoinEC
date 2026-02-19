import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProductDetailEditor from '@/components/ProductDetailEditor';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  if (session.user.role !== 'SELLER') {
    redirect('/');
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      splits: true,
      images: { orderBy: { sortOrder: 'asc' as const } },
      shop: { select: { id: true, ownerId: true, name: true } },
      orders: {
        select: { id: true, amountPaid: true, status: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  if (product.shop.ownerId !== session.user.id) {
    redirect('/dashboard');
  }

  const activeOrders = product.orders.filter((o) => o.status !== 'FAILED');
  const totalRevenue = activeOrders.reduce(
    (sum, o) => sum + Number(o.amountPaid),
    0
  );

  const serialized = {
    id: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    priceJPYC: product.priceJPYC.toString(),
    stock: product.stock,
    isPublished: product.isPublished,
    onChainProductId: product.onChainProductId?.toString() ?? null,
    txHash: product.txHash,
    splits: product.splits,
    images: product.images,
    _summary: {
      orderCount: product.orders.length,
      activeOrderCount: activeOrders.length,
      totalRevenue,
    },
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← ダッシュボードに戻る
        </Link>
      </div>
      <ProductDetailEditor product={serialized} />
    </div>
  );
}
