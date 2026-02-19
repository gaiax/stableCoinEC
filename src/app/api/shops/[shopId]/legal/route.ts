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
        legalBusinessName: true,
        legalAddress: true,
        legalPhone: true,
        legalEmail: true,
        legalBusinessHours: true,
        legalShippingInfo: true,
        legalReturnPolicy: true,
        legalPaymentMethod: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'ショップが見つかりません' }, { status: 404 });
    }

    if (shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'この情報を閲覧する権限がありません' }, { status: 403 });
    }

    return NextResponse.json({ legal: shop });
  } catch (error) {
    console.error('Legal GET error:', error);
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
      return NextResponse.json({ error: 'この情報を変更する権限がありません' }, { status: 403 });
    }

    const body = await request.json();

    const allowedFields = [
      'legalBusinessName',
      'legalAddress',
      'legalPhone',
      'legalEmail',
      'legalBusinessHours',
      'legalShippingInfo',
      'legalReturnPolicy',
      'legalPaymentMethod',
    ] as const;

    const updateData: Record<string, string | null> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: updateData,
      select: {
        id: true,
        name: true,
        legalBusinessName: true,
        legalAddress: true,
        legalPhone: true,
        legalEmail: true,
        legalBusinessHours: true,
        legalShippingInfo: true,
        legalReturnPolicy: true,
        legalPaymentMethod: true,
      },
    });

    return NextResponse.json({ legal: updatedShop });
  } catch (error) {
    console.error('Legal PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
