import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: 'demo-hash',
      name: 'デモショップオーナー',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9E66D2E2D3F6c',
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: 'demo-shop' },
    update: {},
    create: {
      ownerId: user.id,
      name: 'デモショップ',
      slug: 'demo-shop',
    },
  });

  const existing = await prisma.product.findFirst({ where: { title: 'テスト商品A' } });
  if (!existing) {
    await prisma.product.create({
      data: {
        shopId: shop.id,
        title: 'テスト商品A',
        description: 'JPYC決済のテスト用商品です。購入するとJPYCが即時分配されます。',
        priceJPYC: '1000',
        isPublished: true,
        splits: {
          create: [
            { recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9E66D2E2D3F6c', percentage: 8000 },
            { recipientAddress: '0x1234567890abcdef1234567890abcdef12345678', percentage: 2000 },
          ],
        },
      },
    });
  }

  console.log('Seed completed: user', user.id, 'shop', shop.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
