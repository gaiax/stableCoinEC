# 認証システムマニュアル

## アーキテクチャ

- **ライブラリ**: NextAuth.js v5 (beta) + Credentials Provider
- **パスワード**: bcryptjs（ハッシュ化、ラウンド数: 12）
- **セッション**: JWT（サーバーサイドセッション不使用）
- **ロール**: BUYER / SELLER / ADMIN

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/lib/auth.ts` | NextAuth設定（Provider, Callbacks, Pages） |
| `src/types/next-auth.d.ts` | TypeScript型拡張（User, Session, JWT に role/shopId 追加） |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth APIルートハンドラ |
| `src/app/api/auth/register/route.ts` | ユーザー登録API |
| `src/middleware.ts` | 認証ミドルウェア |
| `src/app/providers.tsx` | SessionProvider + WagmiProvider |
| `src/components/AuthMenu.tsx` | ヘッダー認証メニュー |

## ユーザー登録API

### エンドポイント

```
POST /api/auth/register
Content-Type: application/json
```

### 購入者登録

```json
{
  "email": "buyer@example.com",
  "password": "password123",
  "name": "テスト購入者"
}
```

### 出品者登録

```json
{
  "email": "seller@example.com",
  "password": "password123",
  "name": "テスト出品者",
  "role": "SELLER",
  "shopName": "テストショップ",
  "shopSlug": "test-shop"
}
```

出品者登録時に以下が自動設定されます:
- Shop レコード作成
- `legalPaymentMethod`: 「日本円ステーブルコインJPYCによる決済」

### レスポンス

成功時（201）:
```json
{
  "user": {
    "id": "clxxxxxxxxxx",
    "email": "seller@example.com",
    "name": "テスト出品者",
    "role": "SELLER"
  }
}
```

### エラーコード

| ステータス | エラー | 原因 |
|-----------|--------|------|
| 400 | メールアドレスとパスワードは必須です | 必須項目不足 |
| 400 | 出品者登録にはショップ名とスラグが必要です | SELLER 登録時に shopName/shopSlug なし |
| 409 | このメールアドレスは既に登録されています | メール重複 |

## ログイン

NextAuth の標準エンドポイントを使用します。

### curl でのログイン

```bash
# CSRF トークン取得
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')

# ログイン
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=seller@example.com&password=password123&csrfToken=$CSRF" \
  -c cookies.txt -L
```

### セッション確認

```bash
curl http://localhost:3000/api/auth/session -b cookies.txt
```

## ミドルウェア

`src/middleware.ts` で以下のパスを保護:
- `/dashboard` 以下 → ログイン必須
- `/mypage` 以下 → ログイン必須

未ログインの場合は `/login` にリダイレクトされます。

## セッション情報

JWT トークンに含まれる情報:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | ユーザーID |
| role | UserRole | BUYER / SELLER / ADMIN |
| shopId | string? | SELLER の場合のみ、ショップID |

### サーバーサイドでの取得

```typescript
import { auth } from '@/lib/auth';

const session = await auth();
if (!session?.user?.id) {
  // 未認証
}
console.log(session.user.role);   // "SELLER"
console.log(session.user.shopId); // "clxxxxxxxxxx"
```

### クライアントサイドでの取得

```typescript
'use client';
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();
if (status === 'authenticated') {
  console.log(session.user.role);
}
```

## テストユーザー（シードデータ）

| メール | パスワード | ロール | 備考 |
|--------|-----------|--------|------|
| seller@example.com | password123 | SELLER | デモショップ付き |
| buyer@example.com | password123 | BUYER | - |
