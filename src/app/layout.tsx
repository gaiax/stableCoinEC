import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AuthMenu } from '@/components/AuthMenu';
import Link from 'next/link';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'StableCoinEC - JPYC決済ECサイト',
  description: 'JPYCで即時決済・売上分配ができるECサイト',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <Providers>
          <header className="bg-primary sticky top-0 z-50">
            <div className="container mx-auto px-6 h-16 flex justify-between items-center">
              <Link href="/" className="text-xl font-bold tracking-tight text-white">
                StableCoinEC
              </Link>
              <nav className="flex gap-6 items-center">
                <AuthMenu />
              </nav>
            </div>
          </header>
          <main className="container mx-auto px-6 py-10">
            {children}
          </main>
          <footer className="bg-primary mt-20">
            <div className="container mx-auto px-6 py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-lg font-bold text-white mb-3">StableCoinEC</p>
                  <p className="text-sm text-white/70 leading-relaxed">
                    JPYCで即時決済・売上分配ができるECサイト
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-3">リンク</p>
                  <div className="flex flex-col gap-2">
                    <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
                      商品一覧
                    </Link>
                    <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                      ログイン
                    </Link>
                    <Link href="/register" className="text-sm text-white/70 hover:text-white transition-colors">
                      新規登録
                    </Link>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-3">ポリシー</p>
                  <div className="flex flex-col gap-2">
                    <Link href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">
                      利用規約
                    </Link>
                    <Link href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">
                      プライバシーポリシー
                    </Link>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/20 mt-8 pt-6">
                <p className="text-xs text-white/50 text-center">
                  Copyright &copy; StableCoinEC. All Rights Reserved.
                </p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
