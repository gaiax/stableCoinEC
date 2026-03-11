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
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-bold tracking-tight">商品一覧</h2>
        <ConnectButton />
      </div>
      {products.length === 0 ? (
        <p className="text-muted-foreground text-center py-16 text-sm">
          まだ商品がありません
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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
