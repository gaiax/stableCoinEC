import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // 出品者ユーザー
  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      passwordHash,
      name: 'デモショップオーナー',
      role: 'SELLER',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9E66D2E2D3F6c',
    },
  });

  // 購入者ユーザー
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      passwordHash,
      name: 'テスト購入者',
      role: 'BUYER',
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: 'demo-shop' },
    update: {},
    create: {
      ownerId: seller.id,
      name: 'デモショップ',
      slug: 'demo-shop',
      description: 'JPYC決済のデモショップです',
      shippingFee: '500',
      freeShippingThreshold: '5000',
      legalBusinessName: 'デモ株式会社',
      legalAddress: '東京都渋谷区テスト1-2-3',
      legalPhone: '03-1234-5678',
      legalEmail: 'legal@example.com',
      legalBusinessHours: '平日 10:00〜18:00',
      legalShippingInfo: '注文から3営業日以内に発送',
      legalReturnPolicy: '商品到着後7日以内であれば返品可能',
      legalPaymentMethod: '日本円ステーブルコインJPYCによる決済',
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
        stock: 10,
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

  console.log('Seed completed:');
  console.log('  Seller:', seller.id, seller.email);
  console.log('  Buyer:', buyer.id, buyer.email);
  console.log('  Shop:', shop.id, shop.slug);
  console.log('  Password for all users: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
