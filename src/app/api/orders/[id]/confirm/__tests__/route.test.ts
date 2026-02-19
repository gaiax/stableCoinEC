/**
 * @jest-environment node
 */

/**
 * /api/orders/[id]/confirm API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: Prisma
const mockOrderFindUnique = jest.fn();
const mockOrderUpdate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
  },
}));

// モック: viem-admin
const mockGetTransactionReceipt = jest.fn();
jest.mock('@/lib/viem-admin', () => ({
  getPublicClient: () => ({
    getTransactionReceipt: mockGetTransactionReceipt,
  }),
}));

import { POST } from '../route';

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/orders/order-1/confirm', {
    method: 'POST',
  });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/orders/[id]/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('存在しない注文で404を返す', async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    const res = await POST(createRequest(), createParams('nonexistent'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });

  it('トランザクション成功でCONFIRMEDに更新', async () => {
    const order = {
      id: 'order-1',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      status: 'PENDING',
    };
    mockOrderFindUnique.mockResolvedValue(order);
    mockGetTransactionReceipt.mockResolvedValue({ status: 'success' });
    mockOrderUpdate.mockResolvedValue({ ...order, status: 'CONFIRMED' });

    const res = await POST(createRequest(), createParams('order-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('CONFIRMED');
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('トランザクション失敗でFAILEDに更新', async () => {
    const order = {
      id: 'order-2',
      txHash: '0x1234',
      status: 'PENDING',
    };
    mockOrderFindUnique.mockResolvedValue(order);
    mockGetTransactionReceipt.mockResolvedValue({ status: 'reverted' });
    mockOrderUpdate.mockResolvedValue({ ...order, status: 'FAILED' });

    const res = await POST(createRequest(), createParams('order-2'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.status).toBe('FAILED');
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-2' },
      data: { status: 'FAILED' },
    });
  });

  it('viem エラーで500を返す', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 'order-3',
      txHash: '0x1234',
    });
    mockGetTransactionReceipt.mockRejectedValue(new Error('RPC error'));

    const res = await POST(createRequest(), createParams('order-3'));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
