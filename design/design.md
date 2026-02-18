# 設計書 JPYC決済・即時売上分配 ECプラットフォーム StableCoinEC

## 1. プロジェクト概要

* **目的:** ステーブルコイン(JPYC)決済専用の簡易ECサイト構築。
* **コア機能:**
* **JPYC決済:** 日本円連動ステーブルコイン(JPYC)を使用。
* **即時レベニューシェア:** 購入と同時に、スマートコントラクトが売上を指定された複数のEOAへ自動分配。
* **ガスレス商品登録:** 出品者はガス代不要。運営(Admin)がVercel上のバックエンド処理でガス代を代理負担し、コントラクトへ登録。
* **MetaMask連携:** 購入者は自身のMetaMaskを使用して支払い承認(Approve)と購入(Buy)を行う。


* **インフラ:** Vercel (Frontend & Serverless Functions) + Polygon (Blockchain)。

## 2. 技術スタック (Tech Stack)

* **Infrastructure:** **Vercel** (Hosting & Serverless Functions)
* **Network:** **Polygon PoS** (Mainnet / Amoy Testnet) ※JPYCの流通量とガス代の安さから選定
* **Currency:** **JPYC** (ERC20)
* **Frontend:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS, shadcn/ui
* **Database:** PostgreSQL (Docker / Supabase or Neon)
* **ORM:** Prisma 5.x
* **Wallet Connection:** **RainbowKit** + **wagmi v2** + **viem v2**
* **Smart Contract:** Solidity 0.8.20 (Hardhat 2.x + OpenZeppelin 5.x)

## 3. システムアーキテクチャ

### 3.1 ハイレベル・フロー

1. **商品登録フロー (出品者 - Gasless):**
* 出品者がWebフォームで商品情報と分配設定（例: 自分 `0xAAA...` 80%, 共同者 `0xBBB...` 20%）を入力。
* Vercel API Routes (`/api/products/register`) がリクエストを受信。
* `x-api-key` ヘッダーで `API_SECRET_KEY` を照合し認証。
* サーバーサイドで**運営のAdmin Wallet**がガス代を支払い、スマートコントラクトの `registerProduct` を実行。
* トランザクションレシートの `ProductRegistered` イベントログを解析し `onChainProductId` を取得。
* 成功後、DBに商品情報（`onChainProductId` 含む）を保存。


2. **購入フロー (購入者 - MetaMask):**
* 購入者がサイトにアクセスし、MetaMaskを接続 (RainbowKit/wagmi)。
* 購入ボタン押下:
1. **Approve:** JPYCコントラクトに対し、決済コントラクトが代金を引き出せるよう承認トランザクションを送信。
2. **Buy:** 決済コントラクトの `buy` 関数を実行するトランザクションを送信。


* コントラクト内でJPYCがBuyerから各Recipientへ**即時分配**される。
* 購入完了後、フロントエンドが `/api/orders` にtxHashを送信しDBに記録。


## 4. データモデル (Prisma Schema)

```prisma
// schema.prisma

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // Connection pooling recommended for Vercel
  directUrl = env("DIRECT_URL")       // Direct connection for migrations
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String    // Web2 Login credentials
  walletAddress String?   // Revenue receiving address (EOA for JPYC)
  name          String?
  shops         Shop[]
  createdAt     DateTime  @default(now())
}

model Shop {
  id          String    @id @default(cuid())
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])
  name        String
  slug        String    @unique
  products    Product[]
}

model Product {
  id              String   @id @default(cuid())
  shopId          String
  shop            Shop     @relation(fields: [shopId], references: [id])

  // Metadata
  title           String
  description     String?
  imageUrl        String?

  // On-chain Data
  onChainProductId BigInt? @unique   // registerProduct() のProductRegisteredイベントから取得
  priceJPYC       Decimal            // Price in JPYC (Display)

  splits          SplitSetting[]
  orders          Order[]

  isPublished     Boolean  @default(false)
  txHash          String?            // Registration Transaction Hash
  createdAt       DateTime @default(now())
}

model SplitSetting {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])

  recipientAddress String // EOA Address to receive JPYC
  percentage       Int    // Basis Points (e.g., 5000 = 50.00%)
}

model Order {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id])

  buyerAddress    String   // MetaMask address used for purchase
  txHash          String   @unique // On-chain Purchase Tx Hash
  amountPaid      Decimal  // JPYC amount
  status          OrderStatus @default(PENDING)
  createdAt       DateTime @default(now())
}

enum OrderStatus {
  PENDING
  CONFIRMED
  FAILED
}
```

## 5. スマートコントラクト設計 (Solidity)

JPYC (ERC20) に特化した決済・分配コントラクトです。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JpycSplitMarketplace is Ownable, ReentrancyGuard {

    IERC20 public immutable jpycToken;

    struct Split {
        address recipient;
        uint256 basisPoints; // 100% = 10000
    }

    struct Product {
        uint256 price; // Price in JPYC wei (1 JPYC = 10^18)
        bool isActive;
        Split[] splits;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductRegistered(uint256 indexed productId, uint256 price);
    event Purchase(uint256 indexed productId, address indexed buyer, uint256 price);
    event RevenueDistributed(uint256 indexed productId, address indexed recipient, uint256 amount);

    constructor(address _jpycTokenAddress) Ownable(msg.sender) {
        jpycToken = IERC20(_jpycTokenAddress);
    }

    /**
     * @dev 運営(Admin)が実行。商品と分配ルールをオンチェーンに登録。
     * ガス代は運営負担。
     * @return productId 採番されたプロダクトID（0始まりの連番）
     */
    function registerProduct(
        uint256 _price,
        address[] calldata _recipients,
        uint256[] calldata _basisPoints
    ) external onlyOwner returns (uint256) {
        require(_recipients.length == _basisPoints.length, "Length mismatch");
        require(_recipients.length > 0, "No recipients");

        uint256 totalBp = 0;
        for(uint256 i = 0; i < _basisPoints.length; i++) {
            totalBp += _basisPoints[i];
        }
        require(totalBp == 10000, "Total must be 100%");

        uint256 productId = nextProductId++;
        Product storage p = products[productId];
        p.price = _price;
        p.isActive = true;

        for(uint256 i = 0; i < _recipients.length; i++) {
            p.splits.push(Split({
                recipient: _recipients[i],
                basisPoints: _basisPoints[i]
            }));
        }

        emit ProductRegistered(productId, _price);
        return productId;
    }

    /**
     * @dev 購入者がMetaMask経由で実行。
     * 前提: jpycToken.approve(thisAddress, price) が完了していること。
     */
    function buy(uint256 _productId) external nonReentrant {
        Product storage p = products[_productId];
        require(p.isActive, "Product not active");

        uint256 price = p.price;

        require(jpycToken.transferFrom(msg.sender, address(this), price), "JPYC Transfer failed");

        for(uint256 i = 0; i < p.splits.length; i++) {
            uint256 share = (price * p.splits[i].basisPoints) / 10000;
            if (share > 0) {
                require(jpycToken.transfer(p.splits[i].recipient, share), "Split transfer failed");
                emit RevenueDistributed(_productId, p.splits[i].recipient, share);
            }
        }

        emit Purchase(_productId, msg.sender, price);
    }

    /**
     * @dev 商品情報を取得するビュー関数（フロントエンド・APIからの参照用）
     */
    function getProduct(uint256 _productId) external view returns (
        uint256 price,
        bool isActive,
        address[] memory recipients,
        uint256[] memory basisPoints
    ) {
        Product storage p = products[_productId];
        price = p.price;
        isActive = p.isActive;
        recipients = new address[](p.splits.length);
        basisPoints = new uint256[](p.splits.length);
        for(uint256 i = 0; i < p.splits.length; i++) {
            recipients[i] = p.splits[i].recipient;
            basisPoints[i] = p.splits[i].basisPoints;
        }
    }
}
```

## 6. 実装詳細 & 環境設定

### 6.1 環境変数 (.env.local / Vercel Env)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"

# Blockchain (Polygon)
NEXT_PUBLIC_ALCHEMY_API_KEY="your-alchemy-key"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-project-id" # For RainbowKit

# チェーン切り替え (省略時 or "amoy" → Polygon Amoy, "localhost" → Hardhat Node)
NEXT_PUBLIC_CHAIN="localhost"

# Admin Wallet (Server-side Only - NEXT_PUBLIC_ をつけてはいけない)
ADMIN_PRIVATE_KEY="0x..."               # 運営ウォレットの秘密鍵。商品登録のガス代支払いに使用。
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."    # デプロイしたSplitMarketplaceのアドレス
NEXT_PUBLIC_JPYC_ADDRESS="0x..."        # Polygon上のJPYCアドレス (Amoy: 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB)

# API認証 (商品登録APIの保護)
API_SECRET_KEY="your-secret-key"        # /api/products/register の x-api-key ヘッダーと照合
```

> **注意:** Prisma CLI (`prisma migrate dev`) は `.env.local` を読まないため、
> プロジェクトルートに `.env` ファイルを作成し `DATABASE_URL` / `DIRECT_URL` を設定すること。

### 6.2 チェーン切り替え機構

`NEXT_PUBLIC_CHAIN=localhost` にすることでHardhat Node (chainId: 31337, RPC: `http://127.0.0.1:8545`) に接続する。

| 環境変数値 | フロント接続先 | バックエンドRPC |
|-----------|--------------|----------------|
| `localhost` | Hardhat Node (chainId: 31337) | `http://127.0.0.1:8545` |
| それ以外/未設定 | Polygon Amoy (chainId: 80002) | Alchemy URL |

### 6.3 ローカル開発環境 (Hardhat Node)

テストネット不要でフルフロー検証が可能。

```bash
# ターミナル1: ローカルEVMノード起動
cd contracts && npx hardhat node

# ターミナル2: MockERC20(JPYC代替) + Marketplace をデプロイ、テストアカウントにJPYCミント
npx hardhat run scripts/deploy-local.ts --network localhost
```

`scripts/deploy-local.ts` が行うこと:
- **MockERC20** (JPYC代替トークン) をデプロイ
- **JpycSplitMarketplace** をデプロイ
- Account #1, #2 に 100,000 JPYC をミント
- サンプル商品を2件登録 (productId: 0, 1)
- `.env.local` に設定すべき値を標準出力

Hardhat Nodeのデフォルトアカウント（Admin/Owner用）:
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 6.4 Frontend: 購入ボタン (MetaMask連携)

`wagmi` フックを使用した2ステップ決済フロー。

1. `useWriteContract` (approve) でJPYCの使用を許可。
2. `useWaitForTransactionReceipt` でApprove完了を監視。
3. `useWriteContract` (buy) で購入実行。
4. `useWaitForTransactionReceipt` でBuy完了を監視。
5. 完了後 `/api/orders` にtxHashをPOSTしDBに注文記録。

### 6.5 APIレスポンスのシリアライズ

PrismaのBigInt型 (`onChainProductId`) とDecimal型 (`priceJPYC`, `amountPaid`) はそのままでは `JSON.stringify` できないため、レスポンス返却前に `toString()` で文字列変換する。

```typescript
const serialized = {
  ...product,
  onChainProductId: product.onChainProductId?.toString() ?? null,
  priceJPYC: product.priceJPYC.toString(),
};
return NextResponse.json({ success: true, product: serialized });
```

### 6.6 商品登録APIの認証

`/api/products/register` はサーバーサイドのAdmin Walletを使用するため、APIキーで保護する。

- リクエストヘッダー: `x-api-key: <API_SECRET_KEY の値>`
- ダッシュボードページ (Server Component) から `process.env.API_SECRET_KEY` を読み取り、Client Component (`ProductRegisterForm`) のpropsとして渡す。

## 7. ディレクトリ構造

```text
stableCoinEC/
├── contracts/                        # Hardhat Project
│   ├── contracts/
│   │   ├── JpycSplitMarketplace.sol  # メインコントラクト
│   │   └── mocks/
│   │       └── MockERC20.sol         # ローカルテスト用ERC20モック
│   ├── scripts/
│   │   ├── deploy.ts                 # Amoy Testnetデプロイ用
│   │   └── deploy-local.ts           # Hardhat Nodeローカルデプロイ用
│   ├── test/
│   │   └── JpycSplitMarketplace.test.ts
│   ├── typechain-types/              # TypeChain生成型定義
│   ├── hardhat.config.ts
│   └── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                       # 開発用サンプルデータ投入スクリプト
│   └── migrations/                   # Prismaマイグレーション履歴
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 商品一覧 (Server Component)
│   │   ├── providers.tsx             # Wagmi/RainbowKit Provider
│   │   ├── globals.css
│   │   ├── products/[id]/page.tsx    # 商品詳細
│   │   ├── shops/[slug]/page.tsx     # ショップページ
│   │   ├── dashboard/page.tsx        # 出品者ダッシュボード
│   │   └── api/
│   │       ├── products/register/route.ts   # 商品登録 (Admin Wallet使用)
│   │       └── orders/
│   │           ├── route.ts                 # 注文作成・一覧
│   │           └── [id]/confirm/route.ts    # 注文オンチェーン確認
│   ├── components/
│   │   ├── CheckoutButton.tsx        # MetaMask Approve+Buy フロー
│   │   ├── ProductCard.tsx
│   │   ├── ProductRegisterForm.tsx   # 出品フォーム (split設定UI込み)
│   │   ├── ConnectButton.tsx
│   │   └── ui/                       # shadcn/ui コンポーネント
│   ├── lib/
│   │   ├── prisma.ts                 # PrismaClientシングルトン
│   │   ├── viem-admin.ts             # Server-side Admin Wallet (チェーン切り替え対応)
│   │   ├── wagmi-config.ts           # Client-side Wallet Config (チェーン切り替え対応)
│   │   └── utils.ts                  # shadcn/ui cn()ユーティリティ
│   └── generated/
│       └── contract-abi.ts           # Hardhatコンパイル後のABI定数
├── manual/
│   ├── engineer/                     # エンジニア向けマニュアル
│   └── user/                         # ユーザー向けマニュアル
├── design/
│   ├── design.md                     # 本設計書
│   └── rule.md                       # 実装ルール
├── docker-compose.yml                # ローカル開発用PostgreSQL
├── .env                              # Prisma CLI用DB接続情報 (gitignore対象)
├── .env.local                        # Next.js実行時環境変数 (gitignore対象)
├── .env.local.example                # 環境変数テンプレート
└── package.json
```

## 8. 実装ルール
別ドキュメント rule.md に従うこと
