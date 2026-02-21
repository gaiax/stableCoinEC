# 実装仕様書: 初期セットアップ (feature/initial-setup)

## 1. 概要

StableCoinECプロジェクトの基盤を構築した。対象:

- スマートコントラクト（JPYC即時分配マーケットプレイス）
- データベーススキーマ（Prisma）
- Next.js 15 アプリケーション基盤（App Router + Providers）
- コアAPI Routes（商品登録・注文作成・注文確認）
- UIコンポーネント（CheckoutButton・ProductCard・ConnectButton）
- デプロイスクリプト（テストネット・ローカル）
- コントラクトテスト（Hardhat + Chai）

## 2. スマートコントラクト

### JpycSplitMarketplace.sol

| 項目 | 内容 |
|------|------|
| ファイル | `contracts/contracts/JpycSplitMarketplace.sol` |
| Solidity | ^0.8.20 |
| 継承 | Ownable (OpenZeppelin 5.x), ReentrancyGuard |
| 対象トークン | JPYC (ERC20) — コンストラクタで `immutable` に設定 |

#### 構造体

| 構造体 | フィールド | 説明 |
|--------|-----------|------|
| Split | `address recipient`, `uint256 basisPoints` | 分配先と割合 (10000 = 100%) |
| Product | `uint256 price`, `bool isActive`, `Split[] splits` | 商品情報 |

#### イベント

| イベント | パラメータ | 説明 |
|---------|-----------|------|
| ProductRegistered | `productId (indexed)`, `price` | 商品登録時に発火 |
| Purchase | `productId (indexed)`, `buyer (indexed)`, `price` | 購入時に発火 |
| RevenueDistributed | `productId (indexed)`, `recipient (indexed)`, `amount` | 分配実行時に発火 |

#### 関数

| 関数 | アクセス | 説明 |
|------|---------|------|
| `registerProduct(price, recipients[], basisPoints[])` | onlyOwner | 商品登録。basisPoints合計が10000であること |
| `buy(productId)` | 誰でも (nonReentrant) | 購入・即時分配。transferFromでJPYCを受取→splitsに基づき各recipientにtransfer |
| `getProduct(productId)` | view | 商品情報（price, isActive, recipients[], basisPoints[]）を返す |

#### 分配ロジック

1. `transferFrom` で購入者からコントラクトにJPYCを移転
2. `splits` 配列をループし、`(price * basisPoints[i]) / 10000` を各recipientに `transfer`
3. コントラクトに残高は残らない（全額即時分配）

### MockERC20.sol

| 項目 | 内容 |
|------|------|
| ファイル | `contracts/contracts/mocks/MockERC20.sol` |
| 用途 | ローカルテスト用のJPYC代替トークン |
| 継承 | ERC20 (OpenZeppelin) |
| 追加機能 | `mint(to, amount)` — 誰でも呼び出し可能（テスト用） |
| デシマル | コンストラクタで指定可能（デフォルト18） |

## 3. データベーススキーマ

### ファイル

- `prisma/schema.prisma`

### Enum

| Enum | 値 | 説明 |
|------|-----|------|
| UserRole | BUYER, SELLER, ADMIN | ユーザー権限 |
| OrderStatus | PENDING, CONFIRMED, FAILED | 注文状態 |
| ShippingStatus | UNSHIPPED, SHIPPED, DELIVERED | 発送状態 |

### モデル

| モデル | 主要フィールド | 説明 |
|--------|---------------|------|
| User | id, email, passwordHash, walletAddress?, name?, role, phone? | ユーザー |
| Shop | id, ownerId, name, slug (unique), description?, legal*フィールド, shippingFee?, freeShippingThreshold? | ショップ |
| Product | id, shopId, title, description?, imageUrl?, onChainProductId? (BigInt, unique), priceJPYC (Decimal), stock, isPublished, txHash? | 商品 |
| ProductImage | id, productId, imageUrl, sortOrder | 商品追加画像 |
| SplitSetting | id, productId, recipientAddress, percentage | 売上分配設定 |
| ShippingAddress | id, userId, name, postalCode, prefecture, city, address1, address2?, phone, isDefault | 配送先住所 |
| Order | id, productId, buyerAddress, buyerId?, txHash (unique), amountPaid (Decimal), shippingAddressId?, shippingFee, quantity, status, shippingStatus, trackingNumber?, shippedAt? | 注文 |

### リレーション

```
User 1---* Shop (ownerId)
User 1---* ShippingAddress (userId)
User 1---* Order (buyerId, "BuyerOrders")
Shop 1---* Product (shopId)
Product 1---* SplitSetting (productId)
Product 1---* ProductImage (productId, Cascade削除)
Product 1---* Order (productId)
ShippingAddress 1---* Order (shippingAddressId)
```

## 4. Next.js 基盤

### レイアウト

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/layout.tsx` |
| フォント | Inter (Google Fonts) |
| ヘッダー | サイト名リンク + 商品一覧リンク + AuthMenu |
| フッター | 利用規約・プライバシーポリシーリンク |
| Providers | `<Providers>` でラップ |

### Providers 構成

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/providers.tsx` |
| ディレクティブ | `'use client'` |
| 構成 | SessionProvider > WagmiProvider > QueryClientProvider > RainbowKitProvider |

Provider の入れ子構造:
```
SessionProvider (NextAuth)
  └─ WagmiProvider (wagmiConfig)
       └─ QueryClientProvider (React Query)
            └─ RainbowKitProvider
```

### Prisma Singleton

| 項目 | 内容 |
|------|------|
| ファイル | `src/lib/prisma.ts` |
| パターン | `globalThis` にキャッシュして開発時のホットリロードで接続が増えるのを防止 |
| ログ | 開発環境で `['query']` ログ有効 |

### Viem Admin Client

| 項目 | 内容 |
|------|------|
| ファイル | `src/lib/viem-admin.ts` |
| 用途 | サーバーサイドからコントラクトを呼び出すためのAdmin Wallet |
| チェーン切替 | `NEXT_PUBLIC_CHAIN=localhost` で Hardhat Node、それ以外で Polygon Amoy |
| 公開関数 | `getAdminAccount()`, `getAdminWalletClient()`, `getPublicClient()` |
| 依存環境変数 | `ADMIN_PRIVATE_KEY`, `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_CHAIN` |

### Wagmi Config

| 項目 | 内容 |
|------|------|
| ファイル | `src/lib/wagmi-config.ts` |
| 設定方法 | `@rainbow-me/rainbowkit` の `getDefaultConfig()` |
| チェーン | `NEXT_PUBLIC_CHAIN=localhost` → `[hardhat]`, それ以外 → `[polygonAmoy]` |
| SSR | `ssr: true` |

### Contract ABI

| 項目 | 内容 |
|------|------|
| ファイル | `src/generated/contract-abi.ts` |
| エクスポート | `JPYC_SPLIT_MARKETPLACE_ABI`, `JPYC_ERC20_ABI` |
| 型 | `as const` で型推論を有効化 |
| JPYC ABI | `approve`, `balanceOf`, `allowance` のみ（CheckoutButtonで使用） |

## 5. コアAPI Routes

### POST /api/products/register — 商品登録

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/api/products/register/route.ts` |
| 認証 | `x-api-key` ヘッダーで `API_SECRET_KEY` を照合 |
| リクエスト | `{ shopId, title, description?, imageUrl?, additionalImageUrls?, priceJPYC, splits[], stock? }` |

処理フロー:
1. API Key 認証チェック
2. 必須フィールドバリデーション (`shopId`, `title`, `priceJPYC`, `splits`)
3. 特商法必須4項目チェック (`legalBusinessName`, `legalAddress`, `legalPhone`, `legalEmail`)
4. splits合計が10000 basisPointsであることを検証
5. `getAdminWalletClient()` でコントラクトの `registerProduct` を呼び出し
6. `waitForTransactionReceipt` でレシート取得
7. レシートのログから `ProductRegistered` イベントを `decodeEventLog` で解析し `onChainProductId` を取得
8. Prisma で Product + SplitSetting + ProductImage を一括作成
9. BigInt/Decimal を `.toString()` で変換してレスポンス

エラーレスポンス:
- 401: API Key不正
- 400: 必須フィールド不足 / 特商法未設定 / splits合計不正
- 404: ショップが見つからない
- 500: コントラクトアドレス未設定 / トランザクション失敗

### POST /api/orders — 注文作成

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/api/orders/route.ts` |
| 認証 | なし（ウォレット接続で認証） |
| リクエスト | `{ productId, buyerAddress, buyerId?, shippingAddressId?, txHash, amountPaid, quantity? }` |

処理フロー:
1. 必須フィールドバリデーション (`productId`, `buyerAddress`, `txHash`, `amountPaid`)
2. 商品の在庫チェック
3. `prisma.$transaction` でアトミックに注文作成 + 在庫デクリメント
4. Decimal を `.toString()` で変換してレスポンス

### GET /api/orders — 注文一覧

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/api/orders/route.ts` |
| クエリ | `?buyerAddress=0x...` でフィルタ可能 |
| レスポンス | 注文配列（product情報を含む、BigInt/Decimalは文字列変換済み） |

### POST /api/orders/[id]/confirm — 注文確認

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/api/orders/[id]/confirm/route.ts` |
| params | Next.js 15 形式: `Promise<{ id: string }>` → `await params` |
| 認証 | なし |

処理フロー:
1. 注文をDBから取得
2. `getPublicClient().getTransactionReceipt()` でオンチェーンのレシートを取得
3. `receipt.status === 'success'` なら `CONFIRMED`、それ以外は `FAILED` に更新

## 6. UIコンポーネント

### CheckoutButton

| 項目 | 内容 |
|------|------|
| ファイル | `src/components/CheckoutButton.tsx` |
| ディレクティブ | `'use client'` |
| Props | `productId`, `onChainProductId (bigint)`, `priceJPYC (string)`, `stock (number)` |

購入フロー（2フェーズ）:
1. **Approve**: JPYC ERC20 の `approve` を呼び出し（ユーザーがMetaMaskで承認）
2. **Buy**: Marketplace の `buy` を呼び出し（ユーザーがMetaMaskで確認）
3. **Order記録**: POST /api/orders で注文をDB保存

ステップ遷移:
```
idle → approving → approve-pending → buying → buy-pending → success
                                                            ↓
                                                          error
```

配送先住所機能:
- ログイン時: `/api/addresses` から既存住所を取得、ラジオボタンで選択
- デフォルト住所がある場合は自動選択
- インラインの新規住所追加フォーム
- 未ログイン時: ログインへの誘導メッセージ

在庫切れ時: `stock <= 0` で「売り切れ」ボタン（disabled）を表示

### ProductCard

| 項目 | 内容 |
|------|------|
| ファイル | `src/components/ProductCard.tsx` |
| Props | `id`, `title`, `description?`, `imageUrl?`, `priceJPYC`, `shopName?` |
| UIライブラリ | shadcn/ui (Card, Badge, Button) |
| リンク先 | `/products/${id}` |
| レイアウト | 画像 → タイトル+ショップ名 → 説明文(2行切り詰め) → 価格Badge+詳細ボタン |

### ConnectButton

| 項目 | 内容 |
|------|------|
| ファイル | `src/components/ConnectButton.tsx` |
| ディレクティブ | `'use client'` |
| 実装 | RainbowKit の `ConnectButton` をラップしてエクスポート |

### トップページ

| 項目 | 内容 |
|------|------|
| ファイル | `src/app/page.tsx` |
| レンダリング | Server Component (`force-dynamic`) |
| 表示 | 公開商品 (`isPublished: true`) を新しい順に一覧表示 |
| レイアウト | レスポンシブグリッド (1列/2列/3列) |

## 7. デプロイスクリプト

### テストネットデプロイ (deploy.ts)

| 項目 | 内容 |
|------|------|
| ファイル | `contracts/scripts/deploy.ts` |
| 対象 | Polygon Amoy Testnet |
| コマンド | `npx hardhat run scripts/deploy.ts --network amoy` |
| 処理 | JpycSplitMarketplace をデプロイ（JPYCアドレスはAmoyのもの） |
| 出力 | コントラクトアドレス + `.env.local` 設定用テキスト |

### ローカルデプロイ (deploy-local.ts)

| 項目 | 内容 |
|------|------|
| ファイル | `contracts/scripts/deploy-local.ts` |
| 対象 | Hardhat Node (localhost) |
| コマンド | `npx hardhat run scripts/deploy-local.ts --network localhost` |

処理フロー:
1. MockERC20 (JPYC代替) をデプロイ
2. JpycSplitMarketplace をデプロイ（MockERC20アドレスを渡す）
3. テストアカウント (buyer, seller) に 100,000 JPYC をミント
4. サンプル商品2つを登録:
   - Product #0: 1,000 JPYC → seller 100%
   - Product #1: 500 JPYC → seller 70% / owner 30%
5. `.env.local` 用の環境変数とテストアカウントの秘密鍵を出力

## 8. コントラクトテスト

### ファイル

- `contracts/test/JpycSplitMarketplace.test.ts`

### テスト一覧 (11テスト)

| # | カテゴリ | テスト名 | 検証内容 |
|---|---------|---------|---------|
| 1 | registerProduct | valid splits で登録成功 | イベント発火、price/isActive/recipients/basisPoints の正確性 |
| 2 | registerProduct | basisPoints合計 != 10000 で拒否 | "Total must be 100%" revert |
| 3 | registerProduct | recipients/basisPoints長さ不一致で拒否 | "Length mismatch" revert |
| 4 | registerProduct | recipients が空で拒否 | "No recipients" revert |
| 5 | registerProduct | owner以外の登録を拒否 | OwnableUnauthorizedAccount revert |
| 6 | registerProduct | 連番のproductId割り当て | 0, 1, ... と順番に採番 |
| 7 | buy | JPYC が recipients に正しく分配される | 残高変動、Purchaseイベント、RevenueDistributedイベント、コントラクト残高0 |
| 8 | buy | 未登録商品の購入を拒否 | "Product not active" revert |
| 9 | buy | JPYC残高不足で拒否 | revert |
| 10 | buy | approve不足で拒否 | revert |
| 11 | buy | single recipient (100%) で正しく分配 | recipient残高 = price |

### テスト構成

- フレームワーク: Hardhat + Chai (`expect`)
- フィクスチャ: `loadFixture(deployFixture)` で毎テスト状態リセット
- テストトークン: MockERC20 を deployFixture 内でデプロイ

## 9. 主要な実装パターン

### BigInt/Decimal のJSONシリアライズ

PrismaのBigInt型 (`onChainProductId`) とDecimal型 (`priceJPYC`, `amountPaid`) は `JSON.stringify` に対応しないため、`NextResponse.json()` に渡す前に `.toString()` で文字列変換する。

```ts
const serialized = {
  ...product,
  onChainProductId: product.onChainProductId?.toString() ?? null,
  priceJPYC: product.priceJPYC.toString(),
};
```

### ガスレス商品登録（Admin Wallet パターン）

商品登録時、出品者はガス代を負担しない。サーバーサイドの Admin Wallet (`ADMIN_PRIVATE_KEY`) がコントラクトの `registerProduct` を呼び出す。認証はAPI Key (`x-api-key` ヘッダー) で行う。

```
出品者 → POST /api/products/register (x-api-key) → Admin Wallet → registerProduct() → オンチェーン
```

### onChainProductId の取得（イベントログ解析）

`writeContract` の戻り値はtxHashのみで、Solidityの `return` 値は取得できない。`waitForTransactionReceipt` → `receipt.logs` → `decodeEventLog` でイベントから取得する。

```ts
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
for (const log of receipt.logs) {
  const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
  if (decoded.eventName === 'ProductRegistered') {
    onChainProductId = decoded.args.productId;
  }
}
```

### チェーン切り替え（ローカル/テストネット）

`NEXT_PUBLIC_CHAIN=localhost` 環境変数で Hardhat Node とPolygon Amoy を切り替える。

| ファイル | localhost | デフォルト (Amoy) |
|----------|-----------|------------------|
| `viem-admin.ts` | `http://127.0.0.1:8545` + `hardhat` chain | Alchemy RPC + `polygonAmoy` chain |
| `wagmi-config.ts` | `[hardhat]` | `[polygonAmoy]` |

### Next.js 15 動的ルートの params

Next.js 15 では動的ルートの `params` が `Promise` 型に変更された。`await` で取得する必要がある。

```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### アトミック在庫管理

注文作成と在庫デクリメントを `prisma.$transaction` で一括実行し、レースコンディションを防止する。

```ts
const [order] = await prisma.$transaction([
  prisma.order.create({ data: { ... } }),
  prisma.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  }),
]);
```
