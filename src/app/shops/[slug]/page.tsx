import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ShopPageContent } from '@/components/ShopPageContent';

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!shop) {
    notFound();
  }

  return (
    <ShopPageContent
      shop={{
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        coverImageUrl: shop.coverImageUrl,
        legalEmail: shop.legalEmail,
        legalPhone: shop.legalPhone,
        legalBusinessHours: shop.legalBusinessHours,
        legalBusinessName: shop.legalBusinessName,
        products: shop.products.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          imageUrl: p.imageUrl,
          priceJPYC: p.priceJPYC.toString(),
        })),
      }}
    />
  );
}
