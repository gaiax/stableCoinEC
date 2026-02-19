import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AuthMenu } from '@/components/AuthMenu';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <Providers>
          <header className="border-b">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <Link href="/" className="text-xl font-bold">
                StableCoinEC
              </Link>
              <nav className="flex gap-4 items-center">
                <Link href="/" className="hover:underline">
                  商品一覧
                </Link>
                <AuthMenu />
              </nav>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t mt-16">
            <div className="container mx-auto px-4 py-6">
              <div className="flex gap-6 text-sm text-gray-500">
                <Link href="/terms" className="hover:underline">
                  利用規約
                </Link>
                <Link href="/privacy" className="hover:underline">
                  プライバシーポリシー
                </Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
