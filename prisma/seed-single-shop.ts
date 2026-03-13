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
      name: 'マイショップオーナー',
      role: 'SELLER',
      walletAddress: '0x742D35Cc6634c0532925A3b8d4c9E66d2E2d3F6c',
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
    where: { slug: 'my-shop' },
    update: {},
    create: {
      ownerId: seller.id,
      name: 'マイショップ',
      slug: 'my-shop',
      description: '単店舗モードのテスト用ショップです',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      shippingFee: '500',
      freeShippingThreshold: '5000',
      legalBusinessName: 'マイショップ株式会社',
      legalAddress: '東京都渋谷区テスト1-2-3',
      legalPhone: '03-1234-5678',
      legalEmail: 'info@myshop.example.com',
      legalBusinessHours: '平日 10:00〜18:00',
      legalShippingInfo: '注文から3営業日以内に発送',
      legalReturnPolicy: '商品到着後7日以内であれば返品可能',
      legalPaymentMethod: '日本円ステーブルコインJPYCによる決済',
    },
  });

  // 商品を3つ作成
  const products = [
    { title: '商品A', description: '単店舗テスト商品です', price: '1000', stock: 10 },
    { title: '商品B', description: '2つ目のテスト商品です', price: '2500', stock: 5 },
    { title: '商品C', description: '3つ目のテスト商品です', price: '500', stock: 20 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.product.create({
        data: {
          shopId: shop.id,
          title: p.title,
          description: p.description,
          priceJPYC: p.price,
          stock: p.stock,
          isPublished: true,
          splits: {
            create: [
              { recipientAddress: '0x742D35Cc6634c0532925A3b8d4c9E66d2E2d3F6c', percentage: 10000 },
            ],
          },
        },
      });
    }
  }

  console.log('Single-shop seed completed:');
  console.log('  Seller:', seller.id, seller.email);
  console.log('  Buyer:', buyer.id, buyer.email);
  console.log('  Shop:', shop.id, shop.slug);
  console.log('  Products: 3');
  console.log('  Password for all users: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
