import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { ConnectButton } from '@/components/ConnectButton';

type ShopPageContentProps = {
  shop: {
    name: string;
    slug: string;
    description: string | null;
    coverImageUrl: string | null;
    legalEmail: string | null;
    legalPhone: string | null;
    legalBusinessHours: string | null;
    legalBusinessName: string | null;
    products: {
      id: string;
      title: string;
      description: string | null;
      imageUrl: string | null;
      priceJPYC: string;
    }[];
  };
};

export function ShopPageContent({ shop }: ShopPageContentProps) {
  return (
    <div>
      {shop.coverImageUrl && (
        <div className="relative -mx-6 -mt-10 mb-8">
          <img
            src={shop.coverImageUrl}
            alt={`${shop.name} カバー画像`}
            className="w-full h-48 md:h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h2
              className="text-2xl font-bold tracking-tight text-white"
              style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
            >{shop.name}</h2>
          </div>
        </div>
      )}

      {!shop.coverImageUrl && (
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{shop.name}</h2>
          </div>
        </div>
      )}

      {shop.description && (
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{shop.description}</p>
      )}

      <div className="flex justify-end mb-6">
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
              priceJPYC={product.priceJPYC}
            />
          ))}
        </div>
      )}

      {/* ショップ情報 */}
      <div className="mt-16 border-t pt-10">
        <h3 className="text-sm font-semibold text-foreground mb-3">ショップ情報</h3>
        <dl className="text-sm text-muted-foreground space-y-1">
          <div className="flex gap-2">
            <dt className="font-medium min-w-[5rem]">店名</dt>
            <dd>{shop.name}</dd>
          </div>
          {shop.legalEmail && (
            <div className="flex gap-2">
              <dt className="font-medium min-w-[5rem]">連絡先</dt>
              <dd>{shop.legalEmail}</dd>
            </div>
          )}
          {shop.legalPhone && (
            <div className="flex gap-2">
              <dt className="font-medium min-w-[5rem]">電話番号</dt>
              <dd>{shop.legalPhone}</dd>
            </div>
          )}
          {shop.legalBusinessHours && (
            <div className="flex gap-2">
              <dt className="font-medium min-w-[5rem]">営業時間</dt>
              <dd>{shop.legalBusinessHours}</dd>
            </div>
          )}
        </dl>
        {shop.legalBusinessName && (
          <div className="mt-4">
            <Link
              href={`/shops/${shop.slug}/legal`}
              className="text-sm text-secondary hover:underline transition-colors"
            >
              特定商取引法に基づく表記 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
