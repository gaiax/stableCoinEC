import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, shopName, shopSlug } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (role === 'SELLER') {
      if (!shopName || !shopSlug) {
        return NextResponse.json(
          { error: '出品者登録にはショップ名とスラッグが必要です' },
          { status: 400 }
        );
      }

      const existingShop = await prisma.shop.findUnique({
        where: { slug: shopSlug },
      });

      if (existingShop) {
        return NextResponse.json(
          { error: 'このショップURLは既に使用されています' },
          { status: 409 }
        );
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'SELLER',
          shops: {
            create: {
              name: shopName,
              slug: shopSlug,
              legalPaymentMethod: '日本円ステーブルコインJPYCによる決済',
            },
          },
        },
        include: { shops: { select: { id: true, slug: true } } },
      });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shop: user.shops[0],
      }, { status: 201 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'BUYER',
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}
