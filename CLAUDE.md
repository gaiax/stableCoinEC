# CLAUDE.md - StableCoinEC

## プロジェクト概要
JPYC決済・即時売上分配ECサイト (Polygon Amoy Testnet)

## 技術スタック
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Blockchain:** RainbowKit + wagmi v2 + viem v2
- **Smart Contract:** Hardhat 2.x + Solidity 0.8.20 + OpenZeppelin 5.x
- **DB:** PostgreSQL (Docker) + Prisma 5.x
- **Chain:** Polygon Amoy Testnet / Hardhat Node (ローカル)

## 開発コマンド
```bash
# 起動
docker-compose up -d          # PostgreSQL
npx prisma migrate dev        # DBマイグレーション
npm run dev                   # Next.js開発サーバー

# コントラクト
cd contracts && npx hardhat test                              # テスト
cd contracts && npx hardhat node                              # ローカルノード起動
cd contracts && npx hardhat run scripts/deploy-local.ts --network localhost  # ローカルデプロイ
cd contracts && npx hardhat run scripts/deploy.ts --network amoy            # テストネットデプロイ

# フロントエンドテスト
npm test                      # Jest (※現在設定修正が必要)
npm run test:all              # 全テスト実行（環境分離・DB/コントラクト自動セットアップ）
```

## 重要ドキュメント
- **設計仕様書:** `design/design.md` - システム全体の設計・データモデル・コントラクト仕様・API仕様を記載。実装前に必ず参照すること
- **実装ルール:** `design/rule.md` - 開発時に従うべきルール
- **実装仕様書:** `design/` 配下に機能ごとに作成する (※未作成)。機能を実装したら必ず実装仕様書を書くこと
- **マニュアル (既存):**
  - エンジニア向け: `manual/engineer/` (01_setup, 02_product-register, 03_purchase)
  - ユーザー向け: `manual/user/` (01_purchase, 02_sell)
  - 機能追加・変更時は対応するマニュアルも更新・追加すること

## 実装ルール (詳細: design/rule.md)
1. **テスト必須** - ユニットテストはマスト。E2Eもできれば実装
2. **仕様書更新** - 機能実装・仕様変更時に `design/design.md` を更新
3. **マニュアル生成** - 機能実装ごとに対象者別に生成
   - エンジニア向け: `manual/engineer/`
   - ユーザー向け: `manual/user/` (コマンド・技術用語を避ける)
4. **日本語ドキュメント** - 仕様書・マニュアルはすべて日本語
5. **実装手順** - ブランチ作成 → 実装案 → 承認 → 実装 → テスト → 手動確認 → プッシュ

## コーディング規約

### Prisma BigInt/Decimal のシリアライズ
`NextResponse.json()` に渡す前に `.toString()` で変換する:
```ts
const serialized = {
  ...product,
  onChainProductId: product.onChainProductId?.toString() ?? null,
  priceJPYC: product.priceJPYC.toString(),
};
```

### Next.js 15 動的ルートの型
params は `Promise` 型。`await` で取得:
```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### API認証パターン
`/api/products/register` は `x-api-key` ヘッダーで `API_SECRET_KEY` を照合。
ダッシュボード (Server Component) から `process.env.API_SECRET_KEY` をClient Componentのpropsとして渡す。

### onChainProductId の取得
`writeContract` → `waitForTransactionReceipt` → `decodeEventLog` でイベントから取得:
```ts
const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
if (decoded.eventName === 'ProductRegistered') {
  onChainProductId = decoded.args.productId;
}
```

## 既知の注意点
- **Hardhat v3は使わない** - `@nomicfoundation/hardhat-toolbox@^5` との互換性のため v2 を維持
- **package.json に `"type": "module"` を入れない** - Hardhat 2.x との互換性
- 以下のwarningは無視可: `@react-native-async-storage/async-storage`, `pino-pretty`

## ディレクトリ構造
```
stableCoinEC/
├── contracts/                  # Hardhat 2.x プロジェクト (独自package.json)
│   ├── contracts/              # Solidityソース
│   ├── scripts/                # deploy.ts, deploy-local.ts
│   ├── test/                   # Hardhatテスト (※Jestとは別)
│   └── typechain-types/        # TypeChain生成型
├── prisma/                     # schema.prisma, migrations/, seed.ts
├── src/
│   ├── app/                    # Next.js App Router (pages + API routes)
│   ├── components/             # UI コンポーネント
│   ├── generated/contract-abi.ts
│   └── lib/                    # prisma.ts, viem-admin.ts, wagmi-config.ts
├── design/                     # design.md (設計書), rule.md (ルール)
└── manual/                     # engineer/, user/ (日本語マニュアル)
```
