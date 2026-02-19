import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    // 注文を取得して権限チェック
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: {
          include: { shop: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    if (order.product.shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { trackingNumber } = body;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: order.status === 'PENDING' ? 'CONFIRMED' : undefined,
        shippingStatus: 'SHIPPED',
        trackingNumber: trackingNumber || null,
        shippedAt: new Date(),
      },
      include: {
        product: true,
      },
    });

    const serialized = {
      ...updatedOrder,
      amountPaid: updatedOrder.amountPaid.toString(),
      shippingFee: updatedOrder.shippingFee.toString(),
      product: {
        ...updatedOrder.product,
        onChainProductId: updatedOrder.product.onChainProductId?.toString() ?? null,
        priceJPYC: updatedOrder.product.priceJPYC.toString(),
      },
    };

    return NextResponse.json({ success: true, order: serialized });
  } catch (error) {
    console.error('Ship order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
