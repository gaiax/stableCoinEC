import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ConnectButton } from '@/components/ConnectButton';

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
      },
      owner: true,
    },
  });

  if (!shop) {
    notFound();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{shop.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            オーナー: {shop.owner.name || shop.owner.email}
          </p>
        </div>
        <ConnectButton />
      </div>

      {shop.products.length === 0 ? (
        <p className="text-muted-foreground text-center py-16 text-sm">
          まだ商品がありません
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {shop.products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              description={product.description}
              imageUrl={product.imageUrl}
              priceJPYC={product.priceJPYC.toString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
