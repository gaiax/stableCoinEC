import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicClient } from '@/lib/viem-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const publicClient = getPublicClient();
    const receipt = await publicClient.getTransactionReceipt({
      hash: order.txHash as `0x${string}`,
    });

    const newStatus = receipt?.status === 'success' ? 'CONFIRMED' : 'FAILED';

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Order confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
