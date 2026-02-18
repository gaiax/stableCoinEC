import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CheckoutButton } from '@/components/CheckoutButton';
import { ConnectButton } from '@/components/ConnectButton';
import { Badge } from '@/components/ui/badge';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { shop: true, splits: true },
  });

  if (!product || !product.isPublished) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-end mb-4">
        <ConnectButton />
      </div>

      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.title} className="w-full rounded-lg mb-6" />
      )}

      <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
      <p className="text-muted-foreground mb-4">by {product.shop.name}</p>

      <Badge variant="secondary" className="text-xl font-bold mb-6 inline-block">
        {product.priceJPYC.toString()} JPYC
      </Badge>

      {product.description && (
        <p className="text-gray-700 mb-6">{product.description}</p>
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
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          この商品はまだオンチェーン登録が完了していません
        </p>
      )}
    </div>
  );
}
