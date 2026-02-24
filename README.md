# StableCoinEC

JPYC（日本円ステーブルコイン）決済に対応したECサイトです。購入と同時にスマートコントラクトが売上を複数のウォレットへ即時分配します。

## 主な機能

- **JPYC決済** - MetaMask を使ったステーブルコイン決済
- **即時レベニューシェア** - 購入時にスマートコントラクトが売上を自動分配
- **ガスレス商品登録** - 出品者はガス代不要（運営が代理負担）
- **EC基盤** - 会員認証、在庫管理、注文管理、発送管理、配送先管理

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Wallet | RainbowKit + wagmi v2 + viem v2 |
| Smart Contract | Solidity 0.8.20 (Hardhat 2.x + OpenZeppelin 5.x) |
| DB | PostgreSQL + Prisma 5.x |
| Authentication | NextAuth.js v5 + bcryptjs |
| Chain | Polygon Amoy Testnet |

## セットアップ

### 前提条件

- Node.js 20+
- Docker（PostgreSQL用）
- MetaMask ブラウザ拡張

### 環境変数

`.env.local` を作成し以下を設定:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=  # cloud.walletconnect.com で取得
NEXT_PUBLIC_CONTRACT_ADDRESS=           # デプロイ後に設定
NEXT_PUBLIC_JPYC_ADDRESS=               # デプロイ後に設定
NEXT_PUBLIC_CHAIN="localhost"           # localhost or amoy
ADMIN_PRIVATE_KEY=                      # サーバーサイド用
API_SECRET_KEY=                         # 商品登録API認証用
NEXTAUTH_SECRET=                        # NextAuth用シークレット
```

### 起動手順

```bash
# 依存関係インストール
npm install
cd contracts && npm install && cd ..

# PostgreSQL 起動
docker-compose up -d

# DBマイグレーション & シードデータ投入
npx prisma migrate dev
npx prisma db seed

# ローカルブロックチェーン起動（別ターミナル）
cd contracts && npx hardhat node

# コントラクトデプロイ（別ターミナル）
cd contracts && npx hardhat run scripts/deploy-local.ts --network localhost

# Next.js 開発サーバー起動
npm run dev
```

アプリは http://localhost:3000 で起動します。

### テストネット (Polygon Amoy) へのデプロイ

```bash
cd contracts && npx hardhat run scripts/deploy.ts --network amoy
```

## テスト

```bash
# コントラクトテスト (Hardhat)
cd contracts && npx hardhat test

# Jest ユニットテスト
npm test

# 全テスト一括実行（環境分離・DB/コントラクト自動セットアップ）
npm run test:all
```

## ディレクトリ構造

```
stableCoinEC/
├── contracts/           # Hardhat プロジェクト（Solidity コントラクト）
├── prisma/              # スキーマ・マイグレーション・シード
├── src/
│   ├── app/             # Next.js App Router（ページ & API Routes）
│   ├── components/      # UI コンポーネント
│   ├── generated/       # コントラクト ABI（自動生成）
│   └── lib/             # ユーティリティ（Prisma, viem, wagmi 設定）
├── e2e/                 # Playwright E2E テスト
├── design/              # 設計書・開発ルール
└── manual/              # マニュアル（エンジニア向け・ユーザー向け）
```

## ドキュメント

| ドキュメント | 場所 | 内容 |
|---|---|---|
| 設計仕様書 | [`design/design.md`](design/design.md) | システム設計・データモデル・API仕様 |
| 開発ルール | [`design/rule.md`](design/rule.md) | コーディング規約・実装手順 |
| エンジニア向けマニュアル | [`manual/engineer/`](manual/engineer/) | セットアップ・商品登録・購入フロー等 |
| ユーザー向けマニュアル | [`manual/user/`](manual/user/) | 購入方法・出品方法・アカウント管理 |

## ライセンス

Private
