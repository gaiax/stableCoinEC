/**
 * @jest-environment node
 */

/**
 * /api/orders API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: Prisma
const mockOrderCreate = jest.fn();
const mockOrderFindMany = jest.fn();
const mockProductFindUnique = jest.fn();
const mockProductUpdate = jest.fn();
const mockTransaction = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      create: (...args: unknown[]) => mockOrderCreate(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { POST, GET } from '../route';

describe('POST /api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    productId: 'product-1',
    buyerAddress: '0x1234567890abcdef1234567890abcdef12345678',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    amountPaid: '1000',
  };

  it('必須フィールド不足で400を返す', async () => {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'p1' }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('商品が見つからない場合404を返す', async () => {
    mockProductFindUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('商品が見つかりません');
  });

  it('在庫0で400を返す', async () => {
    mockProductFindUnique.mockResolvedValue({ id: 'product-1', stock: 0 });

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('在庫がありません');
  });

  it('正常な注文作成で200を返す', async () => {
    const createdOrder = {
      id: 'order-1',
      ...validBody,
      amountPaid: { toString: () => '1000' },
      quantity: 1,
      status: 'PENDING',
      createdAt: new Date(),
    };
    mockProductFindUnique.mockResolvedValue({ id: 'product-1', stock: 10 });
    mockTransaction.mockResolvedValue([createdOrder, {}]);

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.amountPaid).toBe('1000');
  });

  it('Prismaエラーで500を返す', async () => {
    mockProductFindUnique.mockResolvedValue({ id: 'product-1', stock: 10 });
    mockTransaction.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('GET /api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('全注文一覧を返す', async () => {
    const orders = [
      {
        id: 'order-1',
        productId: 'product-1',
        buyerAddress: '0xbuyer1',
        txHash: '0xtx1',
        amountPaid: { toString: () => '1000' },
        status: 'CONFIRMED',
        createdAt: new Date(),
        product: {
          id: 'product-1',
          title: 'テスト商品',
          priceJPYC: { toString: () => '1000' },
          onChainProductId: BigInt(0),
        },
      },
    ];
    mockOrderFindMany.mockResolvedValue(orders);

    const req = new NextRequest('http://localhost:3000/api/orders');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].amountPaid).toBe('1000');
    expect(data.orders[0].product.onChainProductId).toBe('0');
    expect(data.orders[0].product.priceJPYC).toBe('1000');
  });

  it('buyerAddressでフィルタされた注文を返す', async () => {
    mockOrderFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/orders?buyerAddress=0xbuyer1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerAddress: '0xbuyer1' },
      })
    );
  });

  it('buyerAddress未指定で全件取得', async () => {
    mockOrderFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/orders');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    );
  });
});
