# 設計書 JPYC決済・即時売上分配 ECプラットフォーム StableCoinEC

## 1. プロジェクト概要

* **目的:** ステーブルコイン(JPYC)決済専用のECサイト構築。
* **コア機能:**
  * **JPYC決済:** 日本円連動ステーブルコイン(JPYC)を使用。
  * **即時レベニューシェア:** 購入と同時に、スマートコントラクトが売上を指定された複数のEOAへ自動分配。
  * **ガスレス商品登録:** 出品者はガス代不要。運営(Admin)がバックエンド処理でガス代を代理負担し、コントラクトへ登録。
  * **MetaMask連携:** 購入者はMetaMaskを使用して支払い承認(Approve)と購入(Buy)を行う。
  * **会員認証:** メール+パスワード認証（NextAuth.js v5）。購入者・出品者のアカウント管理。
  * **EC基盤:** 在庫管理、注文管理、発送管理、配送先管理、特定商取引法対応。
  * **画像管理:** 商品画像のアップロード・複数画像カルーセル表示。
* **インフラ:** Vercel (Frontend & Serverless Functions) + Polygon (Blockchain)。

## 2. 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Infrastructure | Vercel (Hosting & Serverless Functions) |
| Network | Polygon PoS (Mainnet / Amoy Testnet) |
| Currency | JPYC (ERC20) |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Docker / Supabase / Neon) |
| ORM | Prisma 5.x |
| Authentication | NextAuth.js v5 (beta) + bcryptjs |
| Wallet | RainbowKit + wagmi v2 + viem v2 |
| Smart Contract | Solidity 0.8.20 (Hardhat 2.x + OpenZeppelin 5.x) |
| E2E Testing | Playwright (Chromium) |

## 3. システムアーキテクチャ

### 3.1 認証フロー

1. **購入者登録:** メール/パスワード/名前 → User(role=BUYER)作成
2. **出品者登録:** メール/パスワード/名前/ショップ名/slug → User(role=SELLER) + Shop作成
3. **ログイン:** メール/パスワード照合 → JWT session発行
4. **ウォレット連携:** ログイン後にMetaMask接続

### 3.2 商品登録フロー (出品者 - Gasless)

1. 出品者がダッシュボードから商品登録ページへ遷移
2. 商品情報・画像・分配設定を入力
3. 特商法の設定チェック（未設定の場合はエラー）
4. 画像アップロード → `/api/upload` でサーバーに保存
5. `/api/products/register` にリクエスト送信（x-api-key認証）
6. サーバーサイドでAdmin Walletがコントラクトの `registerProduct` を実行
7. トランザクションレシートの `ProductRegistered` イベントから `onChainProductId` を取得
8. DBに商品情報（`onChainProductId` 含む）+ 追加画像を保存

### 3.3 購入フロー (購入者 - MetaMask)

1. 購入者がログインし、MetaMaskを接続
2. 商品詳細ページで商品を確認
3. 「購入する」ボタン押下 → 配送先の選択/新規入力
4. **Approve:** JPYCコントラクトに使用許可トランザクション送信
5. **Buy:** 決済コントラクトの `buy` 関数実行
6. コントラクト内でJPYCが各Recipientへ即時分配
7. フロントエンドが `/api/orders` に buyerId, shippingAddressId, txHash を送信
8. 在庫チェック + Prisma $transaction で注文作成・在庫減算

### 3.4 発送フロー

1. 販売者がダッシュボードで注文を確認
2. 購入者情報・配送先住所を確認
3. 追跡番号を入力して「発送する」→ ShippingStatus: SHIPPED
4. 購入者のマイページに発送状況が反映

## 4. データモデル (Prisma Schema)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  FAILED
}

enum ShippingStatus {
  UNSHIPPED
  SHIPPED
  DELIVERED
}

model User {
  id                String            @id @default(cuid())
  email             String            @unique
  passwordHash      String
  walletAddress     String?
  name              String?
  role              UserRole          @default(BUYER)
  phone             String?
  shops             Shop[]
  shippingAddresses ShippingAddress[]
  buyerOrders       Order[]           @relation("BuyerOrders")
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model Shop {
  id          String    @id @default(cuid())
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])
  name        String
  slug        String    @unique
  description   String?
  logoUrl       String?
  coverImageUrl String?

  // 特定商取引法に基づく表記
  legalBusinessName  String?
  legalAddress       String?
  legalPhone         String?
  legalEmail         String?
  legalBusinessHours String?
  legalShippingInfo  String?
  legalReturnPolicy  String?
  legalPaymentMethod String?

  // 送料設定
  shippingFee           Decimal?
  freeShippingThreshold Decimal?

  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id               String         @id @default(cuid())
  shopId           String
  shop             Shop           @relation(fields: [shopId], references: [id])
  title            String
  description      String?
  imageUrl         String?
  onChainProductId BigInt?        @unique
  priceJPYC        Decimal
  stock            Int            @default(0)
  splits           SplitSetting[]
  images           ProductImage[]
  orders           Order[]
  isPublished      Boolean        @default(false)
  txHash           String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  imageUrl  String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@index([productId])
}

model SplitSetting {
  id               String  @id @default(cuid())
  productId        String
  product          Product @relation(fields: [productId], references: [id])
  recipientAddress String
  percentage       Int     // Basis Points (10000 = 100%)
}

model ShippingAddress {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  name       String
  postalCode String
  prefecture String
  city       String
  address1   String
  address2   String?
  phone      String
  isDefault  Boolean  @default(false)
  orders     Order[]
  createdAt  DateTime @default(now())
}

model Order {
  id                String          @id @default(cuid())
  productId         String
  product           Product         @relation(fields: [productId], references: [id])
  buyerAddress      String
  buyerId           String?
  buyer             User?           @relation("BuyerOrders", fields: [buyerId], references: [id])
  txHash            String          @unique
  amountPaid        Decimal
  shippingAddressId String?
  shippingAddress   ShippingAddress? @relation(fields: [shippingAddressId], references: [id])
  shippingFee       Decimal         @default(0)
  quantity          Int             @default(1)
  status            OrderStatus     @default(PENDING)
  shippingStatus    ShippingStatus  @default(UNSHIPPED)
  trackingNumber    String?
  shippedAt         DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}
```

## 5. スマートコントラクト設計 (Solidity)

JPYC (ERC20) に特化した決済・分配コントラクト。OpenZeppelin UUPS Proxyパターンを採用し、デプロイ後のアップグレードが可能。

### 5.1 アーキテクチャ

- **パターン:** UUPS (Universal Upgradeable Proxy Standard)
- **Solidity:** 0.8.24
- **継承:** Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable
- **デプロイ:** `upgrades.deployProxy()` でProxy経由デプロイ
- **アップグレード:** `upgrades.upgradeProxy()` でロジック差し替え（状態は保持）

### 5.2 コントラクト仕様

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract JpycSplitMarketplace is
    Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable
{
    IERC20 public jpycToken;

    struct Split { address recipient; uint256 basisPoints; }
    struct Product { uint256 price; bool isActive; Split[] splits; }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductRegistered(uint256 indexed productId, uint256 price);
    event Purchase(uint256 indexed productId, address indexed buyer, uint256 price);
    event RevenueDistributed(uint256 indexed productId, address indexed recipient, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _jpycTokenAddress) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        jpycToken = IERC20(_jpycTokenAddress);
    }

    function registerProduct(...) external onlyOwner returns (uint256) { ... }
    function buy(uint256 _productId) external virtual nonReentrant { ... }
    function getProduct(uint256 _productId) external view returns (...) { ... }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    uint256[50] private __gap;
}
```

### 5.3 UUPS Proxy の要点

| 項目 | 説明 |
|------|------|
| constructor | `_disableInitializers()` で実装コントラクトの直接初期化を防止 |
| initialize | Proxy経由の初期化関数。`initializer` modifierで1回のみ実行 |
| _authorizeUpgrade | `onlyOwner` でオーナーのみアップグレード可能 |
| __gap[50] | 将来のストレージ変数追加に備えたスロット予約 |
| jpycToken | `immutable` ではなく通常のstate変数（Proxy互換のため） |
| buy() | `virtual` で将来のV2オーバーライドに対応 |

### 5.4 デプロイ・アップグレード

```bash
# デプロイ（Proxy + 実装コントラクト）
cd contracts && npx hardhat run scripts/deploy.ts --network amoy

# ローカルデプロイ
cd contracts && npx hardhat run scripts/deploy-local.ts --network localhost

# アップグレード（PROXY_ADDRESS環境変数が必要）
PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade.ts --network amoy
```

## 6. API仕様

### 6.1 認証API

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | /api/auth/register | なし | ユーザー登録（BUYER/SELLER） |
| GET/POST | /api/auth/[...nextauth] | なし | NextAuth標準ハンドラ |

### 6.2 商品API

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | /api/products/register | x-api-key | 商品登録（特商法チェック + Admin Wallet） |
| GET | /api/products/[id] | セッション+オーナー | 商品詳細取得 |
| PATCH | /api/products/[id] | セッション+オーナー | 商品情報更新（販売停止含む） |
| POST | /api/upload | セッション | 画像アップロード（5MB, JPEG/PNG/WebP） |
| POST | /api/products/[id]/images | セッション+オーナー | 追加画像登録 |
| DELETE | /api/products/[id]/images/[imageId] | セッション+オーナー | 追加画像削除 |

### 6.3 注文API

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | /api/orders | なし | 注文作成（在庫チェック+$transaction） |
| GET | /api/orders | なし | 注文一覧 |
| POST | /api/orders/[id]/confirm | なし | オンチェーン確認 |
| PATCH | /api/orders/[id]/ship | セッション+オーナー | 発送処理 |

### 6.4 ショップAPI

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET/PATCH | /api/shops/[shopId]/settings | セッション+オーナー | ショップ設定 |
| GET/PATCH | /api/shops/[shopId]/legal | セッション+オーナー | 特商法設定 |
| GET | /api/shops/[shopId]/orders | セッション+オーナー | ショップ注文一覧 |

### 6.5 ユーザーAPI

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | /api/users/me/orders | セッション | 購入者注文履歴 |
| GET/POST | /api/addresses | セッション | 配送先一覧・作成 |
| GET/PATCH/DELETE | /api/addresses/[id] | セッション | 配送先個別操作 |

## 7. フロントエンド画面一覧

### 7.1 公開ページ

| パス | 説明 |
|------|------|
| / | トップページ（ショップ1つ→ショップページへリダイレクト、複数→新着商品+ショップ一覧） |
| /products/[id] | 商品詳細（カルーセル画像、購入ボタン+配送先選択）※売上分配は非表示 |
| /shops/[slug] | ショップページ |
| /shops/[slug]/legal | 特定商取引法に基づく表記 |
| /login | ログイン |
| /register | 購入者登録 |
| /register/seller | 出品者登録 |
| /privacy | プライバシーポリシー |
| /terms | 利用規約 |

### 7.2 購入者ページ（要ログイン）

| パス | 説明 |
|------|------|
| /mypage | マイページ（注文履歴一覧） |
| /mypage/orders/[id] | 注文詳細（発送状況） |
| /mypage/addresses | 配送先管理 |

### 7.3 販売者ページ（要ログイン + SELLER）

| パス | 説明 |
|------|------|
| /dashboard | ダッシュボード（サマリー、最近の注文、商品管理、売上分配） |
| /dashboard/settings | ショップ設定 |
| /dashboard/settings/legal | 特商法設定 |
| /dashboard/orders | 注文一覧 |
| /dashboard/orders/[id] | 注文詳細・発送処理 |
| /dashboard/products/new | 商品登録 |
| /dashboard/products/[id] | 商品詳細・編集・販売停止/再開 |

## 8. 実装詳細 & 環境設定

### 8.1 環境変数 (.env.local)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"

# Blockchain
NEXT_PUBLIC_ALCHEMY_API_KEY="your-alchemy-key"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-project-id"
NEXT_PUBLIC_CHAIN="localhost"

# Admin Wallet (Server-side Only)
ADMIN_PRIVATE_KEY="0x..."
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_JPYC_ADDRESS="0x..."

# API認証
API_SECRET_KEY="your-secret-key"
```

### 8.2 チェーン切り替え

| 環境変数値 | フロント接続先 | バックエンドRPC |
|-----------|--------------|----------------|
| `localhost` | Hardhat Node (chainId: 31337) | `http://127.0.0.1:8545` |
| それ以外/未設定 | Polygon Amoy (chainId: 80002) | Alchemy URL |

### 8.3 APIレスポンスのシリアライズ

PrismaのBigInt型とDecimal型は `toString()` で文字列変換してから `NextResponse.json()` に渡す。

### 8.4 認証パターン

- **商品登録API:** `x-api-key` ヘッダーで `API_SECRET_KEY` を照合
- **ショップ管理API:** セッション認証 + `shop.ownerId === session.user.id` を確認
- **APIキーの受け渡し:** Server Component → Client Component のprops経由

### 8.5 特商法チェック

商品登録時に `legalBusinessName`, `legalAddress`, `legalPhone`, `legalEmail` の4項目が設定済みかを確認。未設定の場合は400エラー。出品者登録時にデフォルト支払方法「日本円ステーブルコインJPYCによる決済」を自動設定。

## 9. ディレクトリ構造

```text
stableCoinEC/
├── contracts/                          # Hardhat Project
│   ├── contracts/
│   │   ├── JpycSplitMarketplace.sol
│   │   └── mocks/MockERC20.sol
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── deploy-local.ts
│   ├── test/
│   └── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── uploads/products/               # 画像アップロード先
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # トップページ（新着商品+ショップ一覧 / リダイレクト）
│   │   ├── providers.tsx               # SessionProvider + WagmiProvider
│   │   ├── middleware.ts               # 認証ミドルウェア
│   │   ├── (auth)/                     # 認証ページ (login, register, register/seller)
│   │   ├── (static)/                   # 静的ページ (privacy, terms)
│   │   ├── products/[id]/page.tsx      # 商品詳細
│   │   ├── shops/[slug]/              # ショップ関連
│   │   ├── dashboard/                  # 販売者ダッシュボード
│   │   │   ├── page.tsx
│   │   │   ├── settings/              # ショップ設定 + 特商法
│   │   │   ├── orders/                # 注文管理
│   │   │   └── products/              # 商品管理 (new, [id])
│   │   ├── mypage/                     # 購入者マイページ
│   │   │   ├── page.tsx
│   │   │   ├── orders/[id]/
│   │   │   └── addresses/
│   │   └── api/                        # API Routes
│   │       ├── auth/
│   │       ├── products/
│   │       ├── orders/
│   │       ├── shops/
│   │       ├── users/
│   │       ├── addresses/
│   │       └── upload/
│   ├── components/
│   │   ├── CheckoutButton.tsx          # 購入 + 配送先選択
│   │   ├── ProductCard.tsx
│   │   ├── ProductRegisterForm.tsx     # 商品登録（画像アップロード対応）
│   │   ├── ProductDetailEditor.tsx     # 商品編集・販売停止
│   │   ├── ImageCarousel.tsx           # 画像カルーセル
│   │   ├── DashboardOrderList.tsx      # 注文一覧
│   │   ├── AuthMenu.tsx                # 認証メニュー
│   │   ├── ConnectButton.tsx           # ウォレット接続 + JPYC残高表示
│   │   └── ui/                         # shadcn/ui
│   ├── lib/
│   │   ├── auth.ts                     # NextAuth設定
│   │   ├── prisma.ts
│   │   ├── viem-admin.ts
│   │   ├── wagmi-config.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── next-auth.d.ts              # NextAuth型拡張
│   └── generated/
│       └── contract-abi.ts
├── design/
│   ├── design.md                       # 本設計書
│   ├── rule.md                         # 実装ルール
│   ├── ec-essentials-spec.md           # EC機能実装仕様書
│   └── split-ui-improvement-spec.md   # 分配率UI改善+JPYC残高表示仕様書
├── manual/
│   ├── engineer/                       # エンジニア向けマニュアル
│   └── user/                           # ユーザー向けマニュアル
├── docker-compose.yml
└── package.json
```

## 10. UIデザイン仕様

### 10.1 カラースキーム

gaiax.co.jp のブランドカラーに準拠。

| 用途 | カラー | HSL |
|------|--------|-----|
| Primary（ネイビー） | #002554 | 211 100% 16% |
| Primary Foreground | #ffffff | 0 0% 100% |
| Secondary（ティール） | #449a96 | 177 39% 44% |
| Secondary Foreground | #ffffff | 0 0% 100% |
| Background | #ffffff | 0 0% 100% |
| Foreground | #333333 | 0 0% 20% |
| Muted | — | 210 20% 96% |
| Muted Foreground | — | 210 5% 46% |
| Accent | — | 177 30% 93% |
| Border | — | 210 15% 90% |

CSS変数は `src/app/globals.css` の `:root` で定義（HSL形式）。

### 10.2 フォント

- **Noto Sans JP** (Google Fonts)
- ウェイト: 400 (Regular), 500 (Medium), 700 (Bold)
- `next/font/google` で最適化読み込み

### 10.3 ヘッダー

gaiax.co.jp のヘッダーデザインに準拠。

- **背景:** ネイビー (`bg-primary` = #002554)
- **高さ:** 64px (`h-16`)
- **位置:** Sticky (`sticky top-0 z-50`)
- **ロゴ:** 白テキスト、太字、`text-xl`、クリックでトップページに遷移
- **ナビ:** AuthMenuのみ（認証状態によりログイン/新規登録 or ダッシュボード/マイページ/ログアウト）
- **新規登録ボタン:** ティール背景 (`bg-secondary`) + 白テキスト（アクセント）
- **レイアウト:** ロゴ左寄せ、ナビ右寄せ (`flex justify-between`)

### 10.4 フッター

gaiax.co.jp のフッターデザインに準拠。

- **背景:** ネイビー (`bg-primary` = #002554)
- **テキスト:** 白 (`text-white`)、リンクは白70%透過でホバー時に白100%
- **レイアウト:** 3カラムグリッド (`grid-cols-1 md:grid-cols-3`)
  - カラム1: サイト名 + 説明文
  - カラム2: サイトリンク（ログイン、新規登録）
  - カラム3: ポリシーリンク（利用規約、プライバシーポリシー）
- **コピーライト:** 区切り線 (`border-white/20`) の下に中央配置
- **マージン:** コンテンツとの間に `mt-20`

### 10.5 トップページ

ショップ数に応じて動的に切り替わる。

**ショップ1つの場合（単店舗モード）:**
- トップページアクセス時、そのショップページ (`/shops/[slug]`) にリダイレクト
- 単店舗ECサイトとして動作

**ショップ複数の場合（モールモード）:**
- **新着商品セクション:** 最新8件を横スクロールカルーセルで表示
  - カード幅: `w-48 md:w-56`、`flex-shrink-0`
  - スクロールバー非表示 (`scrollbar-hide` ユーティリティ)
- **ショップ一覧セクション:** 全ショップをリスト表示
  - 左カラム: ロゴ画像（丸型 `w-16 h-16`、未設定時は頭文字表示）
  - 右カラム: ショップ名、説明文（2行制限）、公開商品数
  - カード全体がショップページへのリンク

### 10.6 商品カード

- カード全体がクリックで商品詳細に遷移 (`div` + `onClick` + `useRouter`)
- ショップ名はショップページへのリンク（`stopPropagation` で親クリックと分離）
- 画像: 4:3アスペクト比 (`aspect-[4/3]`)、`object-cover`
- **テキスト部分の背景:** 薄いグレー (`#F1F3F7`)、`flex-1` でカード下部まで埋める
- ホバーエフェクト: スケールアップ + シャドウ (`hover:scale-[1.02] hover:shadow-lg`)

### 10.7 商品詳細ページ

- 最大幅 `max-w-2xl`、中央寄せ
- 画像カルーセル (`ImageCarousel`)
- ショップ名をリンクで商品名の上に表示（クリックでショップページに遷移）
- 価格はプレーンテキスト（太字 `text-2xl`）+ 残り在庫数
- SOLD OUT時は `Badge variant="destructive"`

### 10.8 ショップページ

- **カバー画像:** 全幅ヒーロー表示 (`h-48 md:h-64`)、グラデーションオーバーレイ、ショップ名（白文字 + ドロップシャドウ）
- **カバー画像なし:** テキストのみのヘッダー
- **ショップ説明:** カバー画像の直下に表示
- **商品グリッド:** 2列 → 3列(md) → 4列(lg)
- **ショップ情報セクション（ページ下部）:** 店名、連絡先、電話番号、営業時間
- **特商法リンク:** `/shops/[slug]/legal` への遷移リンク

### 10.9 ショップ設定（ダッシュボード）

- カバー画像アップロード/プレビュー/削除（既存の `/api/upload` を利用）
- 基本設定: ショップ名、説明、Walletアドレス、送料設定

## 11. 実装ルール

別ドキュメント `rule.md` に従うこと。
