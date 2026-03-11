import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CheckoutButton } from '@/components/CheckoutButton';
import { ConnectButton } from '@/components/ConnectButton';
import { ImageCarousel } from '@/components/ImageCarousel';
import { Badge } from '@/components/ui/badge';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      shop: true,
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!product || !product.isPublished) {
    notFound();
  }

  // メイン画像 + 追加画像を結合
  const allImages: string[] = [];
  if (product.imageUrl) allImages.push(product.imageUrl);
  product.images.forEach((img) => allImages.push(img.imageUrl));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-end mb-6">
        <ConnectButton />
      </div>

      {allImages.length > 0 && (
        <div className="mb-6">
          <ImageCarousel images={allImages} alt={product.title} />
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-1">
        {product.shop.name}
      </p>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
        {product.stock <= 0 && (
          <Badge variant="destructive" className="text-xs">SOLD OUT</Badge>
        )}
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-2xl font-bold text-foreground">
          {product.priceJPYC.toString()} JPYC
        </span>
        <span className="text-xs text-muted-foreground">
          残り {product.stock} 点
        </span>
      </div>

      {product.description && (
        <div className="text-sm text-muted-foreground mb-8 whitespace-pre-wrap leading-relaxed">
          {product.description}
        </div>
      )}

      {product.onChainProductId !== null ? (
        <CheckoutButton
          productId={product.id}
          onChainProductId={product.onChainProductId}
          priceJPYC={product.priceJPYC.toString()}
          stock={product.stock}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          この商品はまだオンチェーン登録が完了していません
        </p>
      )}
    </div>
  );
}
