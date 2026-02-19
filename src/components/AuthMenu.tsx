'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function AuthMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <span className="text-sm text-gray-400">...</span>;
  }

  if (!session) {
    return (
      <div className="flex gap-3 items-center">
        <Link href="/login" className="text-sm hover:underline">
          ログイン
        </Link>
        <Link
          href="/register"
          className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
        >
          新規登録
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-center">
      <span className="text-sm text-gray-600">
        {session.user.name || session.user.email}
      </span>
      {session.user.role === 'SELLER' && (
        <Link href="/dashboard" className="text-sm hover:underline">
          ダッシュボード
        </Link>
      )}
      <Link href="/mypage" className="text-sm hover:underline">
        マイページ
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm text-gray-500 hover:underline"
      >
        ログアウト
      </button>
    </div>
  );
}
