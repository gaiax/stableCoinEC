import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AddressManager } from '@/components/AddressManager';

export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const addresses = await prisma.shippingAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const serializedAddresses = addresses.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">配送先住所の管理</h2>
        <a href="/mypage" className="text-sm text-muted-foreground hover:underline">
          マイページに戻る
        </a>
      </div>
      <AddressManager initialAddresses={serializedAddresses} />
    </div>
  );
}
