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
      splits: true,
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
      <div className="flex justify-end mb-4">
        <ConnectButton />
      </div>

      {allImages.length > 0 && (
        <ImageCarousel images={allImages} alt={product.title} />
      )}

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        {product.stock <= 0 && (
          <Badge variant="destructive" className="text-sm">SOLD OUT</Badge>
        )}
      </div>
      <p className="text-muted-foreground mb-4">by {product.shop.name}</p>

      <div className="flex items-center gap-4 mb-6">
        <Badge variant="secondary" className="text-xl font-bold inline-block">
          {product.priceJPYC.toString()} JPYC
        </Badge>
        <span className="text-sm text-muted-foreground">
          残り {product.stock} 点
        </span>
      </div>

      {product.description && (
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">{product.description}</div>
      )}

      <div className="border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">売上分配</h3>
        {product.splits.map((split) => (
          <div key={split.id} className="flex justify-between text-sm text-muted-foreground py-1">
            <span className="font-mono">
              {split.recipientAddress.slice(0, 6)}...{split.recipientAddress.slice(-4)}
            </span>
            <span>{split.percentage / 100}%</span>
          </div>
        ))}
      </div>

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
