import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    // 所有者チェック
    const existing = await prisma.shippingAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '住所が見つかりません' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { name, postalCode, prefecture, city, address1, address2, phone, isDefault } = body;

    // isDefault=true の場合、既存のデフォルトを解除
    if (isDefault && !existing.isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.shippingAddress.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        postalCode: postalCode ?? existing.postalCode,
        prefecture: prefecture ?? existing.prefecture,
        city: city ?? existing.city,
        address1: address1 ?? existing.address1,
        address2: address2 !== undefined ? (address2 || null) : existing.address2,
        phone: phone ?? existing.phone,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error('Address update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    // 所有者チェック
    const existing = await prisma.shippingAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: '住所が見つかりません' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }

    // 注文に使われている住所は削除不可をチェック
    const ordersUsingAddress = await prisma.order.count({
      where: { shippingAddressId: id },
    });

    if (ordersUsingAddress > 0) {
      return NextResponse.json(
        { error: 'この住所は注文に使用されているため削除できません' },
        { status: 400 }
      );
    }

    await prisma.shippingAddress.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Address delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
