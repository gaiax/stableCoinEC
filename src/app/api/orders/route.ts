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

    return NextResponse.json({ success: true, order });
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

  return NextResponse.json({ orders });
}
