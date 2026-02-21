import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProductRegisterForm } from '@/components/ProductRegisterForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
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
      walletAddress: true,
      legalBusinessName: true,
      legalAddress: true,
      legalPhone: true,
      legalEmail: true,
    },
  });

  if (!shop) {
    redirect('/dashboard');
  }

  const isLegalComplete = !!(
    shop.legalBusinessName && shop.legalAddress && shop.legalPhone && shop.legalEmail
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">商品登録</h2>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ダッシュボードに戻る
        </Link>
      </div>

      {isLegalComplete ? (
        <ProductRegisterForm
          shopId={shop.id}
          apiKey={process.env.API_SECRET_KEY ?? ''}
          shopWalletAddress={shop.walletAddress}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            特定商取引法に基づく表記が未設定です
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            商品を登録するには、事業者名・住所・電話番号・メールアドレスの設定が必要です。
            <Link href="/dashboard/settings" className="text-blue-600 hover:underline ml-1">
              設定ページ
            </Link>
            から入力してください。
          </p>
        </div>
      )}
    </div>
  );
}
