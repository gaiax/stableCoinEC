import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function ShopLegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const shop = await prisma.shop.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      legalBusinessName: true,
      legalAddress: true,
      legalPhone: true,
      legalEmail: true,
      legalBusinessHours: true,
      legalShippingInfo: true,
      legalReturnPolicy: true,
      legalPaymentMethod: true,
    },
  });

  if (!shop) {
    notFound();
  }

  const hasAnyLegalInfo =
    shop.legalBusinessName ||
    shop.legalAddress ||
    shop.legalPhone ||
    shop.legalEmail ||
    shop.legalBusinessHours ||
    shop.legalShippingInfo ||
    shop.legalReturnPolicy ||
    shop.legalPaymentMethod;

  const legalItems = [
    { label: '販売業者', value: shop.legalBusinessName },
    { label: '所在地', value: shop.legalAddress },
    { label: '電話番号', value: shop.legalPhone },
    { label: 'メールアドレス', value: shop.legalEmail },
    { label: '営業時間', value: shop.legalBusinessHours },
    { label: '支払方法', value: shop.legalPaymentMethod },
    { label: '配送について', value: shop.legalShippingInfo },
    { label: '返品・交換について', value: shop.legalReturnPolicy },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/shops/${shop.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {shop.name} に戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h1>
      <p className="text-muted-foreground mb-8">ショップ: {shop.name}</p>

      {!hasAnyLegalInfo ? (
        <p className="text-muted-foreground text-center py-12">
          特定商取引法に基づく表記はまだ登録されていません。
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              {legalItems.map(
                (item) =>
                  item.value && (
                    <tr key={item.label} className="border-b last:border-b-0">
                      <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium w-1/3 align-top">
                        {item.label}
                      </th>
                      <td className="px-4 py-3 text-sm whitespace-pre-wrap">{item.value}</td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
