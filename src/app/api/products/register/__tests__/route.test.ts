/**
 * @jest-environment node
 */

/**
 * /api/products/register API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: Prisma
const mockPrismaProductCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      create: (...args: unknown[]) => mockPrismaProductCreate(...args),
    },
  },
}));

// モック: viem-admin
const mockWriteContract = jest.fn();
const mockWaitForTransactionReceipt = jest.fn();
jest.mock('@/lib/viem-admin', () => ({
  getAdminWalletClient: () => ({
    writeContract: mockWriteContract,
  }),
  getPublicClient: () => ({
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
  }),
}));

// モック: viem (parseEther は実物使用、decodeEventLog はモック)
const mockDecodeEventLog = jest.fn();
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    decodeEventLog: (...args: unknown[]) => mockDecodeEventLog(...args),
  };
});

import { POST } from '../route';

function createRequest(body: Record<string, unknown>, apiKey?: string): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/products/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
  return req;
}

const validBody = {
  shopId: 'shop-1',
  title: 'テスト商品',
  description: 'テスト説明',
  imageUrl: 'https://example.com/img.png',
  priceJPYC: '1000',
  splits: [
    { recipientAddress: '0x1234567890abcdef1234567890abcdef12345678', percentage: 8000 },
    { recipientAddress: '0xabcdef1234567890abcdef1234567890abcdef12', percentage: 2000 },
  ],
};

describe('POST /api/products/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_SECRET_KEY = 'test-secret';
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  });

  it('APIキー未設定で401を返す', async () => {
    const res = await POST(createRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('APIキー不正で401を返す', async () => {
    const res = await POST(createRequest(validBody, 'wrong-key'));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('必須フィールド不足で400を返す', async () => {
    const res = await POST(createRequest({ shopId: 'shop-1' }, 'test-secret'));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('splits合計が10000でない場合400を返す', async () => {
    const body = {
      ...validBody,
      splits: [
        { recipientAddress: '0x1234567890abcdef1234567890abcdef12345678', percentage: 5000 },
        { recipientAddress: '0xabcdef1234567890abcdef1234567890abcdef12', percentage: 3000 },
      ],
    };
    const res = await POST(createRequest(body, 'test-secret'));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Split percentages must total 10000 basis points');
  });

  it('コントラクトアドレス未設定で500を返す', async () => {
    delete process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const res = await POST(createRequest(validBody, 'test-secret'));
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe('Contract address not configured');
  });

  it('正常な商品登録で200を返す', async () => {
    const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    mockWriteContract.mockResolvedValue(txHash);
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      logs: [
        {
          data: '0x',
          topics: ['0xtopic'],
        },
      ],
    });
    mockDecodeEventLog.mockReturnValue({
      eventName: 'ProductRegistered',
      args: { productId: BigInt(0) },
    });

    const createdProduct = {
      id: 'product-1',
      shopId: 'shop-1',
      title: 'テスト商品',
      description: 'テスト説明',
      imageUrl: 'https://example.com/img.png',
      priceJPYC: { toString: () => '1000' },
      onChainProductId: BigInt(0),
      txHash,
      isPublished: true,
      splits: [],
      createdAt: new Date(),
    };
    mockPrismaProductCreate.mockResolvedValue(createdProduct);

    const res = await POST(createRequest(validBody, 'test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.product.title).toBe('テスト商品');
    expect(data.product.onChainProductId).toBe('0');
    expect(data.product.priceJPYC).toBe('1000');
    expect(data.txHash).toBe(txHash);
  });

  it('トランザクション失敗で500を返す', async () => {
    mockWriteContract.mockResolvedValue('0xtxhash');
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: 'reverted',
      logs: [],
    });

    const res = await POST(createRequest(validBody, 'test-secret'));
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe('Transaction failed');
  });
});
