/**
 * @jest-environment node
 */

/**
 * /api/products/[id] API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: auth
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// モック: Prisma
const mockProductFindUnique = jest.fn();
const mockProductUpdate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
  },
}));

import { GET, PATCH } from '../route';

// パラメータヘルパー
const makeParams = (id: string) => Promise.resolve({ id });

describe('GET /api/products/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証なしで401を返す', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/products/p1');
    const res = await GET(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('商品が見つからない場合404を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/products/p-notfound');
    const res = await GET(req, { params: makeParams('p-notfound') });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('商品が見つかりません');
  });

  it('他人のショップの商品で403を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      title: 'Test',
      priceJPYC: { toString: () => '1000' },
      onChainProductId: null,
      shop: { id: 'shop-1', ownerId: 'user-other', name: 'Other Shop' },
      splits: [],
      orders: [],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1');
    const res = await GET(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('この商品を閲覧する権限がありません');
  });

  it('正常に商品データを返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      title: 'テスト商品',
      description: '説明文',
      imageUrl: null,
      priceJPYC: { toString: () => '1500' },
      stock: 10,
      isPublished: true,
      onChainProductId: BigInt(5),
      txHash: '0xabc',
      createdAt: new Date(),
      updatedAt: new Date(),
      shop: { id: 'shop-1', ownerId: 'user-1', name: 'My Shop' },
      splits: [
        { id: 's1', recipientAddress: '0xrecipient', percentage: 10000 },
      ],
      orders: [
        { id: 'o1', amountPaid: { toString: () => '1500' }, status: 'CONFIRMED' },
        { id: 'o2', amountPaid: { toString: () => '1500' }, status: 'FAILED' },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1');
    const res = await GET(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.product.title).toBe('テスト商品');
    expect(data.product.priceJPYC).toBe('1500');
    expect(data.product.onChainProductId).toBe('5');
    expect(data.product._summary.orderCount).toBe(2);
    expect(data.product._summary.activeOrderCount).toBe(1);
    expect(data.product._summary.totalRevenue).toBe(1500);
  });
});

describe('PATCH /api/products/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証なしで401を返す', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'new' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('他人のショップの商品で403を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-other' },
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'new' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('この商品を変更する権限がありません');
  });

  it('isPublishedをtoggleして200を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      isPublished: true,
      shop: { ownerId: 'user-1' },
    });
    mockProductUpdate.mockResolvedValue({
      id: 'p1',
      title: 'テスト',
      isPublished: false,
      priceJPYC: { toString: () => '1000' },
      onChainProductId: null,
      splits: [],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: false }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.product.isPublished).toBe(false);
  });

  it('titleを更新して200を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });
    mockProductUpdate.mockResolvedValue({
      id: 'p1',
      title: '新しい商品名',
      priceJPYC: { toString: () => '1000' },
      onChainProductId: null,
      splits: [],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新しい商品名' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.product.title).toBe('新しい商品名');
  });

  it('空のtitleで400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('商品名は必須です');
  });

  it('不正な価格で400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceJPYC: '-100' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('価格は0より大きい数値を指定してください');
  });

  it('不正な在庫数で400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: '-5' }),
    });
    const res = await PATCH(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('在庫数は0以上の整数を指定してください');
  });
});
