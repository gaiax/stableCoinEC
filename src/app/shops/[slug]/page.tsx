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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold">{shop.name}</h2>
          <p className="text-muted-foreground">
            オーナー: {shop.owner.name || shop.owner.email}
          </p>
        </div>
        <ConnectButton />
      </div>

      {shop.products.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          まだ商品がありません
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
