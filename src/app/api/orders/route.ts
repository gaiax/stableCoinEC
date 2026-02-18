import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, buyerAddress, txHash, amountPaid } = body;

    if (!productId || !buyerAddress || !txHash || !amountPaid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        productId,
        buyerAddress,
        txHash,
        amountPaid,
        status: 'PENDING',
      },
    });

    const serialized = { ...order, amountPaid: order.amountPaid.toString() };
    return NextResponse.json({ success: true, order: serialized });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buyerAddress = searchParams.get('buyerAddress');

  const orders = await prisma.order.findMany({
    where: buyerAddress ? { buyerAddress } : undefined,
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  // Decimal / BigInt のシリアライズ
  const serialized = orders.map((o) => ({
    ...o,
    amountPaid: o.amountPaid.toString(),
    product: {
      ...o.product,
      onChainProductId: o.product.onChainProductId?.toString() ?? null,
      priceJPYC: o.product.priceJPYC.toString(),
    },
  }));

  return NextResponse.json({ orders: serialized });
}
