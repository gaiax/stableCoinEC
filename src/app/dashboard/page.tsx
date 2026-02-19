import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ConnectButton } from '@/components/ConnectButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const shippingStatusLabels: Record<string, string> = {
  UNSHIPPED: '未発送',
  SHIPPED: '発送済み',
  DELIVERED: '配達完了',
};

const shippingStatusStyle: Record<string, string> = {
  UNSHIPPED: 'bg-yellow-500 text-white hover:bg-yellow-500',
  SHIPPED: 'bg-green-600 text-white hover:bg-green-600',
  DELIVERED: 'bg-blue-600 text-white hover:bg-blue-600',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  if (session.user.role !== 'SELLER') {
    redirect('/');
  }

  const shop = await prisma.shop.findFirst({
    where: { ownerId: session.user.id },
    include: {
      products: {
        include: {
          orders: {
            include: { buyer: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
          },
          splits: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!shop) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">出品者ダッシュボード</h2>
        <p className="text-muted-foreground">
          ショップがまだありません。
          <Link href="/register/seller" className="text-blue-600 hover:underline ml-1">
            出品者登録
          </Link>
          からショップを作成してください。
        </p>
      </div>
    );
  }

  // 特商法チェック
  const isLegalComplete = !!(
    shop.legalBusinessName && shop.legalAddress && shop.legalPhone && shop.legalEmail
  );

  // 集計 (FAILEDを除く有効な注文を対象)
  const allOrders = shop.products.flatMap((p) => p.orders);
  const activeOrders = allOrders.filter((o) => o.status !== 'FAILED');
  const totalRevenue = activeOrders.reduce(
    (sum, o) => sum + Number(o.amountPaid),
    0
  );
  const unshippedCount = activeOrders.filter((o) => o.shippingStatus === 'UNSHIPPED').length;
  const shippedCount = activeOrders.filter((o) => o.shippingStatus === 'SHIPPED').length;
  const recentOrders = allOrders.slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{shop.name}</h2>
          <p className="text-sm text-muted-foreground">出品者ダッシュボード</p>
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/dashboard/orders" className="text-sm hover:underline">注文管理</Link>
          <Link href="/dashboard/settings" className="text-sm hover:underline">設定</Link>
          <Link href={`/shops/${shop.slug}/legal`} className="text-sm hover:underline">特商法</Link>
          <ConnectButton />
        </div>
      </div>

      {/* 特商法未設定の警告 */}
      {!isLegalComplete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            特定商取引法に基づく表記が未設定です
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            商品を登録するには、事業者名・住所・電話番号・メールアドレスの設定が必要です。
            <Link href="/dashboard/settings" className="text-blue-600 hover:underline ml-1">
              設定ページ
            </Link>
            から入力してください。
          </p>
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} JPYC</p>
            <p className="text-xs text-muted-foreground">{activeOrders.length} 件の有効注文</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総注文数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allOrders.length}</p>
            <p className="text-xs text-muted-foreground">全ステータス合計</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">未発送</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{unshippedCount}</p>
            <p className="text-xs text-muted-foreground">発送待ちの注文</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">発送済み</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{shippedCount}</p>
            <p className="text-xs text-muted-foreground">配送中の注文</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左: 最近の注文 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 最近の注文 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">最近の注文</h3>
              <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
                すべての注文を見る →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground">まだ注文がありません。</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const product = shop.products.find((p) => p.id === order.productId);
                  return (
                    <Link
                      key={order.id}
                      href={`/dashboard/orders/${order.id}`}
                      className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product?.title ?? '不明な商品'}</p>
                          <p className="text-sm text-muted-foreground">
                            購入者: {order.buyer?.name || order.buyer?.email || `${order.buyerAddress.slice(0, 6)}...${order.buyerAddress.slice(-4)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.createdAt.toLocaleDateString('ja-JP')} {order.createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-4">
                          <span className="font-medium">{order.amountPaid.toString()} JPYC</span>
                          <Badge className={shippingStatusStyle[order.shippingStatus] ?? ''}>
                            {shippingStatusLabels[order.shippingStatus] ?? order.shippingStatus}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* 右: 商品一覧 + 分配管理 */}
        <div className="space-y-8">
          {/* 商品・在庫・売上 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">商品管理</h3>
              <Link
                href="/dashboard/products/new"
                className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                + 商品追加
              </Link>
            </div>
            {shop.products.length === 0 ? (
              <p className="text-muted-foreground text-sm">商品がまだ登録されていません。</p>
            ) : (
              <div className="space-y-3">
                {shop.products.map((product) => {
                  const productActive = product.orders.filter((o) => o.status !== 'FAILED');
                  const productRevenue = productActive.reduce(
                    (sum, o) => sum + Number(o.amountPaid), 0
                  );
                  return (
                    <Link key={product.id} href={`/dashboard/products/${product.id}`} className="block border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{product.title}</span>
                          {!product.isPublished && (
                            <Badge variant="secondary" className="text-xs">販売停止中</Badge>
                          )}
                        </div>
                        <span className="text-sm">{product.priceJPYC.toString()} JPYC</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>在庫: {product.stock} 個</span>
                          <span>注文: {product.orders.length} 件</span>
                        </div>
                        <div className="flex justify-between">
                          <span>売上: {productRevenue.toLocaleString()} JPYC</span>
                          {product.stock === 0 && (
                            <Badge variant="destructive" className="text-xs">SOLD OUT</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 分配管理 */}
          <div>
            <h3 className="text-xl font-semibold mb-4">売上分配設定</h3>
            {shop.products.length === 0 ? (
              <p className="text-muted-foreground text-sm">商品がまだ登録されていません。</p>
            ) : (
              <div className="space-y-3">
                {shop.products.map((product) => {
                  const productActive = product.orders.filter((o) => o.status !== 'FAILED');
                  const productRevenue = productActive.reduce(
                    (sum, o) => sum + Number(o.amountPaid), 0
                  );
                  return (
                    <div key={product.id} className="border rounded-lg p-3">
                      <p className="font-medium text-sm mb-2">{product.title}</p>
                      {product.splits.length === 0 ? (
                        <p className="text-xs text-muted-foreground">分配設定なし</p>
                      ) : (
                        <div className="space-y-1">
                          {product.splits.map((split) => {
                            const splitAmount = Math.round(productRevenue * split.percentage / 10000);
                            return (
                              <div key={split.id} className="flex justify-between text-xs">
                                <span className="font-mono text-muted-foreground">
                                  {split.recipientAddress.slice(0, 6)}...{split.recipientAddress.slice(-4)}
                                </span>
                                <span>
                                  {(split.percentage / 100).toFixed(1)}% ({splitAmount.toLocaleString()} JPYC)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
