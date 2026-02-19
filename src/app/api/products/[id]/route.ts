import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    if (product.shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'この商品を閲覧する権限がありません' }, { status: 403 });
    }

    const activeOrders = product.orders.filter((o) => o.status !== 'FAILED');
    const totalRevenue = activeOrders.reduce(
      (sum, o) => sum + Number(o.amountPaid),
      0
    );

    const serialized = {
      ...product,
      onChainProductId: product.onChainProductId?.toString() ?? null,
      priceJPYC: product.priceJPYC.toString(),
      orders: product.orders.map((o) => ({
        ...o,
        amountPaid: o.amountPaid.toString(),
      })),
      _summary: {
        orderCount: product.orders.length,
        activeOrderCount: activeOrders.length,
        totalRevenue,
      },
    };

    return NextResponse.json({ product: serialized });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        shop: { select: { ownerId: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    if (product.shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'この商品を変更する権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, imageUrl, priceJPYC, stock, isPublished } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: '商品名は必須です' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null;
    }

    if (priceJPYC !== undefined) {
      const price = parseFloat(priceJPYC);
      if (isNaN(price) || price <= 0) {
        return NextResponse.json({ error: '価格は0より大きい数値を指定してください' }, { status: 400 });
      }
      updateData.priceJPYC = price;
    }

    if (stock !== undefined) {
      const stockNum = parseInt(stock, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        return NextResponse.json({ error: '在庫数は0以上の整数を指定してください' }, { status: 400 });
      }
      updateData.stock = stockNum;
    }

    if (isPublished !== undefined) {
      if (typeof isPublished !== 'boolean') {
        return NextResponse.json({ error: 'isPublishedはboolean値を指定してください' }, { status: 400 });
      }
      updateData.isPublished = isPublished;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { splits: true },
    });

    const serialized = {
      ...updated,
      onChainProductId: updated.onChainProductId?.toString() ?? null,
      priceJPYC: updated.priceJPYC.toString(),
    };

    return NextResponse.json({ product: serialized });
  } catch (error) {
    console.error('Product PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
