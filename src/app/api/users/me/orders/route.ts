import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // buyerId またはウォレットアドレスで検索
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletAddress: true },
    });

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: session.user.id },
          ...(user?.walletAddress ? [{ buyerAddress: user.walletAddress }] : []),
        ],
      },
      include: {
        product: {
          include: { shop: true },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // BigInt / Decimal のシリアライズ
    const serialized = orders.map((o) => ({
      ...o,
      amountPaid: o.amountPaid.toString(),
      shippingFee: o.shippingFee.toString(),
      product: {
        ...o.product,
        onChainProductId: o.product.onChainProductId?.toString() ?? null,
        priceJPYC: o.product.priceJPYC.toString(),
      },
    }));

    return NextResponse.json({ orders: serialized });
  } catch (error) {
    console.error('User orders fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
