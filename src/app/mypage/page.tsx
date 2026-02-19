import { redirect } from 'next/navigation';
import Link from 'next/link';
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

const roleLabels: Record<string, string> = {
  BUYER: '購入者',
  SELLER: '出品者',
  ADMIN: '管理者',
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      walletAddress: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // 最近の注文を取得（最大5件）
  // buyerId または buyerAddress(ウォレット) でマッチ
  const recentOrders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerId: session.user.id },
        ...(user.walletAddress ? [{ buyerAddress: user.walletAddress }] : []),
      ],
    },
    include: {
      product: {
        include: { shop: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">マイページ</h2>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">名前</span>
            <span>{user.name || '未設定'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">メールアドレス</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">アカウント種別</span>
            <Badge variant="outline">{roleLabels[user.role] ?? user.role}</Badge>
          </div>
          {user.walletAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ウォレット</span>
              <span className="font-mono text-sm">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/mypage/addresses"
          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors text-center"
        >
          <p className="font-medium">配送先住所</p>
          <p className="text-sm text-muted-foreground">住所の管理</p>
        </Link>
        {session.user.role === 'SELLER' && (
          <Link
            href="/dashboard"
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors text-center"
          >
            <p className="font-medium">ダッシュボード</p>
            <p className="text-sm text-muted-foreground">出品者管理</p>
          </Link>
        )}
      </div>

      {/* 最近の注文 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>最近の注文</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground">まだ注文がありません。</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/mypage/orders/${order.id}`}
                  className="flex justify-between items-center border rounded p-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{order.product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.product.shop.name} / {order.createdAt.toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{order.amountPaid.toString()} JPYC</p>
                    <Badge className={`text-xs ${shippingStatusStyle[order.shippingStatus] ?? ''}`}>
                      {shippingStatusLabels[order.shippingStatus] ?? order.shippingStatus}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
