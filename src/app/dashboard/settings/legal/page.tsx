import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LegalSettingsForm } from '@/components/LegalSettingsForm';

export const dynamic = 'force-dynamic';

export default async function LegalSettingsPage() {
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
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">特定商取引法に基づく表記</h2>
        <p className="text-muted-foreground">
          ショップがまだありません。先にショップを作成してください。
        </p>
      </div>
    );
  }

  const initialData = {
    legalBusinessName: shop.legalBusinessName,
    legalAddress: shop.legalAddress,
    legalPhone: shop.legalPhone,
    legalEmail: shop.legalEmail,
    legalBusinessHours: shop.legalBusinessHours,
    legalShippingInfo: shop.legalShippingInfo,
    legalReturnPolicy: shop.legalReturnPolicy,
    legalPaymentMethod: shop.legalPaymentMethod,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">特定商取引法に基づく表記</h2>
        <div className="flex gap-3">
          <Link
            href="/dashboard/settings"
            className="text-sm hover:underline text-muted-foreground"
          >
            ショップ設定に戻る
          </Link>
          <Link href="/dashboard" className="text-sm hover:underline text-muted-foreground">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LegalSettingsForm shopId={shop.id} initialData={initialData} />
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">公開ページ</h3>
            <p className="text-sm text-muted-foreground mb-2">
              保存した情報は以下のページで公開されます。
            </p>
            <Link
              href={`/shops/${shop.slug}/legal`}
              className="text-sm text-blue-600 hover:underline"
            >
              特定商取引法に基づく表記を確認する
            </Link>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">入力のポイント</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>特定商取引法により、EC事業者は所定の事項を表示する義務があります</li>
              <li>事業者名、所在地、連絡先は正確に記載してください</li>
              <li>返品・交換ポリシーは具体的に記載することを推奨します</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
