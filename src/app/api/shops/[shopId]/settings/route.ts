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

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        shippingFee: true,
        freeShippingThreshold: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'ショップが見つかりません' }, { status: 404 });
    }

    if (shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'このショップの設定を閲覧する権限がありません' }, { status: 403 });
    }

    const serialized = {
      ...shop,
      shippingFee: shop.shippingFee?.toString() ?? null,
      freeShippingThreshold: shop.freeShippingThreshold?.toString() ?? null,
    };

    return NextResponse.json({ shop: serialized });
  } catch (error) {
    console.error('Shop settings GET error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'ショップが見つかりません' }, { status: 404 });
    }

    if (shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'このショップの設定を変更する権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, shippingFee, freeShippingThreshold } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'ショップ名は必須です' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (shippingFee !== undefined) {
      if (shippingFee === null || shippingFee === '') {
        updateData.shippingFee = null;
      } else {
        const fee = parseFloat(shippingFee);
        if (isNaN(fee) || fee < 0) {
          return NextResponse.json({ error: '送料は0以上の数値を指定してください' }, { status: 400 });
        }
        updateData.shippingFee = fee;
      }
    }

    if (freeShippingThreshold !== undefined) {
      if (freeShippingThreshold === null || freeShippingThreshold === '') {
        updateData.freeShippingThreshold = null;
      } else {
        const threshold = parseFloat(freeShippingThreshold);
        if (isNaN(threshold) || threshold < 0) {
          return NextResponse.json({ error: '送料無料金額は0以上の数値を指定してください' }, { status: 400 });
        }
        updateData.freeShippingThreshold = threshold;
      }
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    const serialized = {
      ...updatedShop,
      shippingFee: updatedShop.shippingFee?.toString() ?? null,
      freeShippingThreshold: updatedShop.freeShippingThreshold?.toString() ?? null,
    };

    return NextResponse.json({ shop: serialized });
  } catch (error) {
    console.error('Shop settings PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
