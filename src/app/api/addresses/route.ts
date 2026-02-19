import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const addresses = await prisma.shippingAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Addresses fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { name, postalCode, prefecture, city, address1, address2, phone, isDefault } = body;

    if (!name || !postalCode || !prefecture || !city || !address1 || !phone) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 });
    }

    // isDefault=true の場合、既存のデフォルトを解除
    if (isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.shippingAddress.create({
      data: {
        userId: session.user.id,
        name,
        postalCode,
        prefecture,
        city,
        address1,
        address2: address2 || null,
        phone,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ success: true, address }, { status: 201 });
  } catch (error) {
    console.error('Address creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
