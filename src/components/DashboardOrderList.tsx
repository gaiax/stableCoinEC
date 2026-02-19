'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SerializedOrder {
  id: string;
  productId: string;
  buyerAddress: string;
  buyerId: string | null;
  txHash: string;
  amountPaid: string;
  shippingFee: string;
  quantity: number;
  status: string;
  shippingStatus: string;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  buyer: {
    name: string | null;
    email: string;
  } | null;
  product: {
    id: string;
    title: string;
    priceJPYC: string;
  };
  shippingAddress: {
    name: string;
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2: string | null;
    phone: string;
  } | null;
}

type FilterTab = 'ALL' | 'UNSHIPPED' | 'SHIPPED' | 'DELIVERED';

const tabLabels: Record<FilterTab, string> = {
  ALL: 'すべて',
  UNSHIPPED: '未発送',
  SHIPPED: '発送済み',
  DELIVERED: '配達完了',
};

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

export function DashboardOrderList({ orders }: { orders: SerializedOrder[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const filteredOrders =
    activeTab === 'ALL'
      ? orders
      : orders.filter((o) => o.shippingStatus === activeTab);

  return (
    <div>
      {/* フィルタータブ */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(tabLabels) as FilterTab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
            <span className="ml-1 text-xs">
              ({tab === 'ALL'
                ? orders.length
                : orders.filter((o) => o.shippingStatus === tab).length})
            </span>
          </Button>
        ))}
      </div>

      {/* 注文リスト */}
      {filteredOrders.length === 0 ? (
        <p className="text-muted-foreground">注文がありません。</p>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{order.product.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    数量: {order.quantity} / {order.amountPaid} JPYC
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={shippingStatusStyle[order.shippingStatus] ?? ''}>
                    {shippingStatusLabels[order.shippingStatus] ?? order.shippingStatus}
                  </Badge>
                  <Badge variant="outline">
                    {orderStatusLabels[order.status] ?? order.status}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>
                  購入者: {order.buyer?.name || order.buyer?.email || `${order.buyerAddress.slice(0, 6)}...${order.buyerAddress.slice(-4)}`}
                  {order.buyer?.email && !order.buyer?.name && ''}
                  {order.buyer?.name && order.buyer?.email && (
                    <span className="text-xs ml-1">({order.buyer.email})</span>
                  )}
                </p>
                {order.shippingAddress ? (
                  <p>
                    配送先: 〒{order.shippingAddress.postalCode} {order.shippingAddress.prefecture}{order.shippingAddress.city}{order.shippingAddress.address1}
                    {order.shippingAddress.address2 ? ` ${order.shippingAddress.address2}` : ''} / {order.shippingAddress.name} / TEL:{order.shippingAddress.phone}
                  </p>
                ) : (
                  <p className="text-orange-500">配送先: 未設定</p>
                )}
                <p>注文日: {new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                {order.trackingNumber && <p>追跡番号: {order.trackingNumber}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
