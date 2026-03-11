import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ConnectButton } from '@/components/ConnectButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const shops = await prisma.shop.findMany({
    include: { _count: { select: { products: { where: { isPublished: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  // ショップが1つだけの場合、そのショップページにリダイレクト
  if (shops.length === 1) {
    redirect(`/shops/${shops[0].slug}`);
  }

  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: { shop: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight">新着商品</h2>
        <ConnectButton />
      </div>

      {/* 新着商品カルーセル */}
      {products.length === 0 ? (
        <p className="text-muted-foreground text-center py-16 text-sm">
          まだ商品がありません
        </p>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
          <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
            {products.map((product) => (
              <div key={product.id} className="w-48 md:w-56 flex-shrink-0">
                <ProductCard
                  id={product.id}
                  title={product.title}
                  description={product.description}
                  imageUrl={product.imageUrl}
                  priceJPYC={product.priceJPYC.toString()}
                  shopName={product.shop.name}
                  shopSlug={product.shop.slug}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ショップ一覧 */}
      <div className="mt-14">
        <h2 className="text-xl font-bold tracking-tight mb-6">ショップ一覧</h2>
        {shops.length === 0 ? (
          <p className="text-muted-foreground text-center py-16 text-sm">
            まだショップがありません
          </p>
        ) : (
          <div className="space-y-4">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shops/${shop.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:shadow-md hover:border-border transition-all"
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                  {shop.logoUrl ? (
                    <img
                      src={shop.logoUrl}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                      {shop.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground">{shop.name}</p>
                  {shop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{shop.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {shop._count.products} 商品
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
