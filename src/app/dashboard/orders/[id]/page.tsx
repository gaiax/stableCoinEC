import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShipOrderForm } from '@/components/ShipOrderForm';
import { Badge } from '@/components/ui/badge';

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

export default async function DashboardOrderDetailPage({
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
      buyer: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!order) {
    notFound();
  }

  // 権限チェック: ショップのオーナーのみ
  if (order.product.shop.ownerId !== session.user.id) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">注文詳細</h2>
        <a href="/dashboard/orders" className="text-sm text-muted-foreground hover:underline">
          注文一覧に戻る
        </a>
      </div>

      <div className="border rounded-lg p-6 space-y-6">
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
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">商品</h3>
          <p className="font-medium">{order.product.title}</p>
          <p className="text-sm text-muted-foreground">
            単価: {order.product.priceJPYC.toString()} JPYC / 数量: {order.quantity}
          </p>
        </div>

        {/* 金額 */}
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">支払い</h3>
          <p>商品金額: {order.amountPaid.toString()} JPYC</p>
          <p>送料: {order.shippingFee.toString()} JPYC</p>
        </div>

        {/* 購入者 */}
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">購入者</h3>
          {order.buyer ? (
            <div className="space-y-1">
              {order.buyer.name && <p className="font-medium">{order.buyer.name}</p>}
              <p className="text-sm">{order.buyer.email}</p>
              {order.buyer.phone && <p className="text-sm">TEL: {order.buyer.phone}</p>}
              <p className="font-mono text-xs text-muted-foreground">Wallet: {order.buyerAddress}</p>
            </div>
          ) : (
            <p className="font-mono text-sm">{order.buyerAddress}</p>
          )}
        </div>

        {/* 配送先 */}
        {order.shippingAddress && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">配送先</h3>
            <p>{order.shippingAddress.name}</p>
            <p>〒{order.shippingAddress.postalCode}</p>
            <p>
              {order.shippingAddress.prefecture}
              {order.shippingAddress.city}
              {order.shippingAddress.address1}
            </p>
            {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
            <p>TEL: {order.shippingAddress.phone}</p>
          </div>
        )}

        {/* トランザクション */}
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">トランザクション</h3>
          <p className="font-mono text-sm break-all">{order.txHash}</p>
        </div>

        {/* 日時 */}
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">日時</h3>
          <p>注文日: {order.createdAt.toLocaleDateString('ja-JP')}</p>
          {order.shippedAt && (
            <p>発送日: {order.shippedAt.toLocaleDateString('ja-JP')}</p>
          )}
        </div>

        {/* 追跡番号 */}
        {order.trackingNumber && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">追跡番号</h3>
            <p>{order.trackingNumber}</p>
          </div>
        )}

        {/* 発送フォーム (未発送の場合のみ) */}
        {order.shippingStatus === 'UNSHIPPED' && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">発送処理</h3>
            <ShipOrderForm orderId={order.id} />
          </div>
        )}
      </div>
    </div>
  );
}
