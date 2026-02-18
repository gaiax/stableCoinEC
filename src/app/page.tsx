import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ConnectButton } from '@/components/ConnectButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: { shop: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">商品一覧</h2>
        <ConnectButton />
      </div>
      {products.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          まだ商品がありません
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              description={product.description}
              imageUrl={product.imageUrl}
              priceJPYC={product.priceJPYC.toString()}
              shopName={product.shop.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
