import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

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
              <h1 className="text-xl font-bold">StableCoinEC</h1>
              <nav className="flex gap-4 items-center">
                <a href="/" className="hover:underline">商品一覧</a>
                <a href="/dashboard" className="hover:underline">ダッシュボード</a>
              </nav>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
