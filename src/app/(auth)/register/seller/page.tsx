'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellerRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(shopSlug)) {
      setError('ショップURLは半角英数字とハイフンのみ使用できます');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role: 'SELLER',
          shopName,
          shopSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('登録は完了しましたが、ログインに失敗しました。ログインページからお試しください。');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">出品者登録</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <fieldset className="border rounded p-4">
          <legend className="text-sm font-medium px-2">アカウント情報</legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                お名前
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="山田太郎"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
                placeholder="example@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border rounded px-3 py-2"
                placeholder="8文字以上"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border rounded px-3 py-2"
                placeholder="もう一度入力"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="border rounded p-4">
          <legend className="text-sm font-medium px-2">ショップ情報</legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium mb-1">
                ショップ名 <span className="text-red-500">*</span>
              </label>
              <input
                id="shopName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
                placeholder="マイショップ"
              />
            </div>
            <div>
              <label htmlFor="shopSlug" className="block text-sm font-medium mb-1">
                ショップURL <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">/shops/</span>
                <input
                  id="shopSlug"
                  type="text"
                  value={shopSlug}
                  onChange={(e) => setShopSlug(e.target.value.toLowerCase())}
                  required
                  pattern="[a-z0-9-]+"
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="my-shop"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                半角英数字とハイフンのみ
              </p>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:bg-gray-400"
        >
          {loading ? '登録中...' : '出品者として登録する'}
        </button>
      </form>
      <div className="mt-4 text-center text-sm space-y-2">
        <p>
          購入者として登録したい方は{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            購入者登録
          </Link>
        </p>
        <p>
          既にアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
