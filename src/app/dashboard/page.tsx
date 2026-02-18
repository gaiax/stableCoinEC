import { prisma } from '@/lib/prisma';
import { ProductRegisterForm } from '@/components/ProductRegisterForm';
import { ConnectButton } from '@/components/ConnectButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // 開発用: 最初のショップを使用 (本番はセッション認証必要)
  const shops = await prisma.shop.findMany({
    include: {
      products: {
        include: { orders: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const defaultShop = shops[0];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">出品者ダッシュボード</h2>
        <ConnectButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">商品を登録する</h3>
          {defaultShop ? (
            <ProductRegisterForm
              shopId={defaultShop.id}
              apiKey="YOUR_API_KEY"
            />
          ) : (
            <p className="text-muted-foreground">
              ショップがまだありません。データベースにショップを作成してください。
            </p>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">登録商品と注文</h3>
          {shops.map((shop) => (
            <div key={shop.id} className="mb-6">
              <h4 className="font-medium mb-2">{shop.name}</h4>
              {shop.products.map((product) => (
                <div key={product.id} className="border rounded p-3 mb-2">
                  <div className="flex justify-between">
                    <span>{product.title}</span>
                    <span>{product.priceJPYC.toString()} JPYC</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    注文数: {product.orders.length}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
