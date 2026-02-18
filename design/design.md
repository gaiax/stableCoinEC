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

Claude Codeへの指示用として以下のスタックを指定します。

* **Infrastructure:** **Vercel** (Hosting & Serverless Functions)
* **Network:** **Polygon PoS** (Mainnet / Amoy Testnet) ※JPYCの流通量とガス代の安さから選定
* **Currency:** **JPYC** (ERC20)
* **Frontend:** Next.js 14+ (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS, shadcn/ui
* **Database:** PostgreSQL (Supabase or Neon - Vercel Integration friendly)
* **ORM:** Prisma
* **Wallet Connection:** **RainbowKit** + **wagmi** + **viem** (Best for MetaMask support)
* **Smart Contract:** Solidity (Hardhat)

## 3. システムアーキテクチャ

### 3.1 ハイレベル・フロー

1. **商品登録フロー (出品者 - Gasless):**
* 出品者がWebフォームで商品情報と分配設定（例: 自分 `0xAAA...` 80%, 共同者 `0xBBB...` 20%）を入力。
* Vercel API Routes (`/api/products/register`) がリクエストを受信。
* サーバーサイドで**運営のAdmin Wallet**がガス代を支払い、スマートコントラクトの `registerProduct` を実行。
* 成功後、DBに商品情報を保存。


2. **購入フロー (購入者 - MetaMask):**
* 購入者がサイトにアクセスし、MetaMaskを接続 (RainbowKit/wagmi)。
* 購入ボタン押下:
1. **Approve:** JPYCコントラクトに対し、決済コントラクトが代金を引き出せるよう承認トランザクションを送信。
2. **Buy:** 決済コントラクトの `buy` 関数を実行するトランザクションを送信。


* コントラクト内でJPYCがBuyerから各Recipientへ**即時分配**される。



## 4. データモデル (Prisma Schema)

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")     // Connection pooling recommended for Vercel
  directUrl = env("DIRECT_URL")      // Direct connection for migrations
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
  onChainProductId BigInt? @unique
  priceJPYC       Decimal  // Price in JPYC (Display)
  
  splits          SplitSetting[]
  orders          Order[]
  
  isPublished     Boolean  @default(false)
  txHash          String?  // Registration Transaction Hash
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
        uint256 price; // Price in Wei (1 JPYC = 10^18 Wei typically)
        bool isActive;
        Split[] splits;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductRegistered(uint256 indexed productId, uint256 price);
    event Purchase(uint256 indexed productId, address indexed buyer, uint256 price);
    event RevenueDistributed(uint256 indexed productId, address indexed recipient, uint256 amount);

    // Constructor: JPYCのアドレスを設定 (Polygon Mainnet/Amoy等)
    constructor(address _jpycTokenAddress) Ownable(msg.sender) {
        jpycToken = IERC20(_jpycTokenAddress);
    }

    /**
     * @dev 運営(Admin)が実行。商品と分配ルールをオンチェーンに登録。
     * ガス代は運営負担。
     */
    function registerProduct(
        uint256 _price,
        address[] calldata _recipients,
        uint256[] calldata _basisPoints
    ) external onlyOwner returns (uint256) {
        require(_recipients.length == _basisPoints.length, "Length mismatch");
        
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
        
        // JPYCをBuyerからコントラクトへ移動
        require(jpycToken.transferFrom(msg.sender, address(this), price), "JPYC Transfer failed");

        // 分配実行
        for(uint256 i = 0; i < p.splits.length; i++) {
            uint256 share = (price * p.splits[i].basisPoints) / 10000;
            if (share > 0) {
                // 各Recipientへ即座にJPYCを送金
                require(jpycToken.transfer(p.splits[i].recipient, share), "Split transfer failed");
                emit RevenueDistributed(_productId, p.splits[i].recipient, share);
            }
        }
        
        emit Purchase(_productId, msg.sender, price);
    }
}

```

## 6. 実装詳細 & 環境設定

### 6.1 環境変数 (.env.local / Vercel Env)

Vercelで安全に動作させるために以下の変数を設定します。

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Blockchain (Polygon)
NEXT_PUBLIC_ALCHEMY_API_KEY="your-alchemy-key"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-project-id" # For RainbowKit

# Admin Wallet (Server-side Only)
ADMIN_PRIVATE_KEY="0x..." # 運営ウォレットの秘密鍵。商品登録のガス代支払いに使用。
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..." # デプロイしたSplitMarketplaceのアドレス
NEXT_PUBLIC_JPYC_ADDRESS="0x..." # Polygon上のJPYCアドレス

```

### 6.2 Frontend: 購入ボタン (MetaMask連携)

`wagmi` フックを使用したコンポーネントのロジック例。

1. `useReadContract` で商品価格を取得。
2. `useWriteContract` (approve) でJPYCの使用を許可。
3. `useWriteContract` (buy) で購入実行。
4. `useWaitForTransactionReceipt` でトランザクション完了を監視し、完了画面へ遷移。

## 7. ディレクトリ構造 (Vercel/Next.js標準)

```text
.
├── contracts/               # Hardhat Project
│   ├── JpycSplitMarketplace.sol
│   ├── hardhat.config.ts
│   └── scripts/             # deploy.ts
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/             # Serverless Functions
│   │   │   └── products/
│   │   │       └── register/
│   │   │           └── route.ts  # Admin Walletでコントラクト叩く処理
│   │   ├── providers.tsx    # Wagmi/RainbowKit Providers
│   │   ├── page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── CheckoutButton.tsx # MetaMask Approve & Buy Logic
│   │   └── ...
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── viem-admin.ts    # Server-side Admin Wallet Client
│   │   └── wagmi-config.ts  # Client-side Wallet Config
│   └── types/
└── ...

```

## 8.実装ルール
別ドキュメント rule.mdに従うこと