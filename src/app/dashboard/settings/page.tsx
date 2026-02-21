import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShopSettingsForm } from '@/components/ShopSettingsForm';

export const dynamic = 'force-dynamic';

export default async function ShopSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (session.user.role !== 'SELLER') {
    redirect('/');
  }

  const shop = await prisma.shop.findFirst({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      walletAddress: true,
      shippingFee: true,
      freeShippingThreshold: true,
    },
  });

  if (!shop) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">ショップ設定</h2>
        <p className="text-muted-foreground">
          ショップがまだありません。先にショップを作成してください。
        </p>
      </div>
    );
  }

  const initialData = {
    name: shop.name,
    description: shop.description,
    walletAddress: shop.walletAddress,
    shippingFee: shop.shippingFee?.toString() ?? null,
    freeShippingThreshold: shop.freeShippingThreshold?.toString() ?? null,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ショップ設定</h2>
        <div className="flex gap-3">
          <Link href="/dashboard" className="text-sm hover:underline text-muted-foreground">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ShopSettingsForm shopId={shop.id} initialData={initialData} />
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">ショップ情報</h3>
            <dl className="text-sm space-y-1">
              <div>
                <dt className="text-muted-foreground">ショップURL</dt>
                <dd>
                  <Link
                    href={`/shops/${shop.slug}`}
                    className="text-blue-600 hover:underline"
                  >
                    /shops/{shop.slug}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">その他の設定</h3>
            <ul className="text-sm space-y-2">
              <li>
                <Link
                  href="/dashboard/settings/legal"
                  className="text-blue-600 hover:underline"
                >
                  特定商取引法に基づく表記
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
