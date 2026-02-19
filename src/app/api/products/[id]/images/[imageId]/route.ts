import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, imageId } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { shop: { select: { ownerId: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    if (product.shop.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'この商品を変更する権限がありません' }, { status: 403 });
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });

    if (!image) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product image DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
