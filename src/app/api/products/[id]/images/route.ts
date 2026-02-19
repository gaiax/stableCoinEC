import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_ADDITIONAL_IMAGES = 4;

export async function POST(
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
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    if (product.shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'この商品を変更する権限がありません' }, { status: 403 });
    }

    if (product.images.length >= MAX_ADDITIONAL_IMAGES) {
      return NextResponse.json(
        { error: `追加画像は最大${MAX_ADDITIONAL_IMAGES}枚までです` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: '画像URLが必要です' }, { status: 400 });
    }

    const maxSortOrder = product.images.reduce(
      (max, img) => Math.max(max, img.sortOrder),
      -1
    );

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        imageUrl,
        sortOrder: maxSortOrder + 1,
      },
    });

    return NextResponse.json({ image });
  } catch (error) {
    console.error('Product image POST error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
