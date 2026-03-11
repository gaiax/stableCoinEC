'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function AuthMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <span className="text-sm text-muted-foreground">...</span>;
  }

  if (!session) {
    return (
      <div className="flex gap-4 items-center">
        <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
          ログイン
        </Link>
        <Link
          href="/register"
          className="text-sm font-medium bg-secondary text-white px-4 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
        >
          新規登録
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <span className="text-sm text-white/60">
        {session.user.name || session.user.email}
      </span>
      {session.user.role === 'SELLER' && (
        <Link href="/dashboard" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
          ダッシュボード
        </Link>
      )}
      <Link href="/mypage" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
        マイページ
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm text-white/80 hover:text-white transition-colors"
      >
        ログアウト
      </button>
    </div>
  );
}
