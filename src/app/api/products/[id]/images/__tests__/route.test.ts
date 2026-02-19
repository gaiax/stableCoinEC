/**
 * @jest-environment node
 */

/**
 * /api/products/[id]/images API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: auth
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// モック: Prisma
const mockProductFindUnique = jest.fn();
const mockProductImageCreate = jest.fn();
const mockProductImageFindFirst = jest.fn();
const mockProductImageDelete = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
    },
    productImage: {
      create: (...args: unknown[]) => mockProductImageCreate(...args),
      findFirst: (...args: unknown[]) => mockProductImageFindFirst(...args),
      delete: (...args: unknown[]) => mockProductImageDelete(...args),
    },
  },
}));

import { POST } from '../route';
import { DELETE } from '../[imageId]/route';

const makeParams = (id: string) => Promise.resolve({ id });
const makeDeleteParams = (id: string, imageId: string) =>
  Promise.resolve({ id, imageId });

describe('POST /api/products/[id]/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証なしで401を返す', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/products/p1/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: '/uploads/products/test.jpg' }),
    });
    const res = await POST(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('他人のショップの商品で403を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-other' },
      images: [],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: '/uploads/products/test.jpg' }),
    });
    const res = await POST(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('画像上限(4枚)で400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
      images: [
        { id: '1', sortOrder: 0 },
        { id: '2', sortOrder: 1 },
        { id: '3', sortOrder: 2 },
        { id: '4', sortOrder: 3 },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: '/uploads/products/test.jpg' }),
    });
    const res = await POST(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('最大4枚');
  });

  it('正常に追加画像を作成して200を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
      images: [{ id: '1', sortOrder: 0 }],
    });
    mockProductImageCreate.mockResolvedValue({
      id: 'img-new',
      productId: 'p1',
      imageUrl: '/uploads/products/test.jpg',
      sortOrder: 1,
    });

    const req = new NextRequest('http://localhost:3000/api/products/p1/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: '/uploads/products/test.jpg' }),
    });
    const res = await POST(req, { params: makeParams('p1') });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.image.imageUrl).toBe('/uploads/products/test.jpg');
    expect(data.image.sortOrder).toBe(1);
  });
});

describe('DELETE /api/products/[id]/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証なしで401を返す', async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/products/p1/images/img1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, { params: makeDeleteParams('p1', 'img1') });
    const data = await res.json();

    expect(res.status).toBe(401);
  });

  it('他人のショップの商品で403を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-other' },
    });

    const req = new NextRequest(
      'http://localhost:3000/api/products/p1/images/img1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, { params: makeDeleteParams('p1', 'img1') });
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('画像が見つからない場合404を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });
    mockProductImageFindFirst.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/products/p1/images/img-notfound',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, {
      params: makeDeleteParams('p1', 'img-notfound'),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('画像が見つかりません');
  });

  it('正常に画像を削除して200を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductFindUnique.mockResolvedValue({
      id: 'p1',
      shop: { ownerId: 'user-1' },
    });
    mockProductImageFindFirst.mockResolvedValue({
      id: 'img1',
      productId: 'p1',
    });
    mockProductImageDelete.mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost:3000/api/products/p1/images/img1',
      { method: 'DELETE' }
    );
    const res = await DELETE(req, { params: makeDeleteParams('p1', 'img1') });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
