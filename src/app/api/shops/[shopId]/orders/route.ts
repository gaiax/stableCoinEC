import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { shopId } = await params;

    // ショップの所有者チェック
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'ショップが見つかりません' }, { status: 404 });
    }

    if (shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }

    // クエリパラメータでフィルタリング
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shippingStatus = searchParams.get('shippingStatus');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      product: { shopId },
    };

    if (status) {
      where.status = status;
    }
    if (shippingStatus) {
      where.shippingStatus = shippingStatus;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: true,
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
    console.error('Seller orders fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
