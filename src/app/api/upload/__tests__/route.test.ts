/**
 * @jest-environment node
 */

/**
 * /api/upload API Route テスト
 */
import { NextRequest } from 'next/server';

// モック: auth
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// モック: fs/promises
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockMkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('fs/promises', () => ({
  __esModule: true,
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

import { POST } from '../route';

function createFileRequest(
  name: string,
  type: string,
  size: number
): NextRequest {
  const content = new Uint8Array(size);
  const file = new File([content], name, { type });
  const formData = new FormData();
  formData.append('file', file);
  return new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('認証なしで401を返す', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createFileRequest('test.jpg', 'image/jpeg', 100);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('ファイルなしで400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('ファイルが必要です');
  });

  it('不正なファイル形式で400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const req = createFileRequest('test.txt', 'text/plain', 100);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('JPEG、PNG、WebP形式のみアップロード可能です');
  });

  it('5MBを超えるファイルで400を返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const req = createFileRequest('big.jpg', 'image/jpeg', 6 * 1024 * 1024);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('ファイルサイズは5MB以下にしてください');
  });

  it('正常なアップロードで200とimageUrlを返す', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const req = createFileRequest('photo.png', 'image/png', 1024);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageUrl).toMatch(/^\/uploads\/products\/.+\.png$/);
  });

  it('WebP画像も正常にアップロードできる', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const req = createFileRequest('photo.webp', 'image/webp', 512);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageUrl).toMatch(/^\/uploads\/products\/.+\.webp$/);
  });
});
