import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

const orderStatusLabels: Record<string, string> = {
  PENDING: '保留中',
  CONFIRMED: '確認済み',
  FAILED: '失敗',
};

export default async function MyPageOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: {
        include: { shop: true },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    notFound();
  }

  // 購入者本人のみ閲覧可能（buyerId またはウォレットアドレスで照合）
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletAddress: true },
  });
  const isBuyer =
    order.buyerId === session.user.id ||
    (user?.walletAddress && order.buyerAddress === user.walletAddress);
  if (!isBuyer) {
    redirect('/mypage');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">注文詳細</h2>
        <a href="/mypage" className="text-sm text-muted-foreground hover:underline">
          マイページに戻る
        </a>
      </div>

      {/* ステータス */}
      <div className="flex gap-3">
        <Badge className={shippingStatusStyle[order.shippingStatus] ?? ''}>
          {shippingStatusLabels[order.shippingStatus] ?? order.shippingStatus}
        </Badge>
        <Badge variant="outline">
          {orderStatusLabels[order.status] ?? order.status}
        </Badge>
      </div>

      {/* 商品情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">商品情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">商品名</span>
            <span className="font-medium">{order.product.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ショップ</span>
            <span>{order.product.shop.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">単価</span>
            <span>{order.product.priceJPYC.toString()} JPYC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">数量</span>
            <span>{order.quantity}</span>
          </div>
        </CardContent>
      </Card>

      {/* 支払い情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">支払い情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">商品金額</span>
            <span>{order.amountPaid.toString()} JPYC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">送料</span>
            <span>{order.shippingFee.toString()} JPYC</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>合計</span>
            <span>
              {(
                parseFloat(order.amountPaid.toString()) +
                parseFloat(order.shippingFee.toString())
              ).toString()}{' '}
              JPYC
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 配送情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">配送情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.shippingAddress ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">宛名</span>
                <span>{order.shippingAddress.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">住所</span>
                <span className="text-right">
                  〒{order.shippingAddress.postalCode}
                  <br />
                  {order.shippingAddress.prefecture}
                  {order.shippingAddress.city}
                  {order.shippingAddress.address1}
                  {order.shippingAddress.address2 && (
                    <>
                      <br />
                      {order.shippingAddress.address2}
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">電話番号</span>
                <span>{order.shippingAddress.phone}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">配送先住所が設定されていません</p>
          )}

          {order.trackingNumber && (
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">追跡番号</span>
              <span className="font-mono">{order.trackingNumber}</span>
            </div>
          )}

          {order.shippedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">発送日</span>
              <span>{order.shippedAt.toLocaleDateString('ja-JP')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* トランザクション情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">トランザクション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">TxHash</span>
            <p className="font-mono text-sm break-all">{order.txHash}</p>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">注文日</span>
            <span>{order.createdAt.toLocaleDateString('ja-JP')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
