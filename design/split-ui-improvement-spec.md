# 実装仕様書: 商品紹介ページ改善 + JPYC残高表示 (feature/product-page-improvements)

## 1. 概要

2つのUI改善を実施する:

1. **商品紹介ページから売上分配セクションを非表示にする** — 購入者にとって不要な情報のため削除
2. **ConnectButton の残高表示をETHからJPYC残高に変更する** — JPYC決済サイトとして適切な残高を表示

## 2. 商品紹介ページの売上分配非表示

### 対象ファイル

| ファイル | 操作 | 内容 |
|----------|------|------|
| `src/app/products/[id]/page.tsx` | 編集 | 売上分配セクション削除、splits の include を削除 |

### 変更内容

#### `src/app/products/[id]/page.tsx`

**Prisma クエリ変更:**
- `include` から `splits: true` を削除（不要なDBクエリを減らす）

**JSX変更:**
- 59-69行目の売上分配セクション（`<div className="border rounded-lg p-4 mb-6">` ブロック全体）を削除

**変更しないもの:**
- ダッシュボード側の商品詳細 (`src/components/ProductDetailEditor.tsx`) の売上分配表示はセラー向けなのでそのまま維持

## 3. ConnectButton のJPYC残高表示

### 対象ファイル

| ファイル | 操作 | 内容 |
|----------|------|------|
| `src/components/ConnectButton.tsx` | 編集 | RainbowKit の `ConnectButton.Custom` を使い、JPYC残高を表示するカスタムUIに変更 |

### 現状

- RainbowKit の `<ConnectButton />` をそのまま使用
- デフォルトでネイティブトークン (ETH / POL) の残高が表示される
- 3箇所で使用: トップページ、商品詳細ページ、ショップページ

### 変更方針

RainbowKit の `ConnectButton.Custom` render props パターンを使い、接続状態に応じたカスタムUIを構築する。
wagmi の `useReadContract` (または `useBalance` ではなくERC20なので `useReadContract`) で JPYC トークンの `balanceOf` を呼び出し残高を取得する。

### 実装詳細

#### JPYC残高取得

```ts
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';

const jpycAddress = process.env.NEXT_PUBLIC_JPYC_ADDRESS as `0x${string}`;

const { data: jpycBalance } = useReadContract({
  address: jpycAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [accountAddress],
  query: { enabled: !!accountAddress },
});
```

- `erc20Abi` は viem に組み込みの標準ERC20 ABIを使用（カスタムABI不要）
- JPYC は decimals=18 なので `formatUnits(jpycBalance, 18)` で人間が読める形式に変換
- `NEXT_PUBLIC_JPYC_ADDRESS` 環境変数からトークンアドレスを取得

#### ConnectButton.Custom UIレイアウト

```
[未接続時]  → 「ウォレット接続」ボタン

[接続済み]  → 「💰 1,000 JPYC | 0x1234...abcd ▼」
               ※ JPYC残高を整数表示（小数切り捨て）
               ※ アドレスクリックで RainbowKit のアカウントモーダルを開く
               ※ チェーン切替が必要な場合はチェーン切替ボタンを表示
```

#### 表示フォーマット

- JPYC残高: 整数表示、3桁区切りカンマ付き（例: `1,000 JPYC`）
- 残高取得中: 「... JPYC」と表示
- アドレス: 先頭6文字 + `...` + 末尾4文字（RainbowKit デフォルトと同じ）

### 使用箇所（変更不要）

ConnectButton コンポーネント内部の変更のみで、使用箇所 (3箇所) は変更不要:
- `src/app/page.tsx` (トップページ)
- `src/app/products/[id]/page.tsx` (商品詳細ページ)
- `src/app/shops/[slug]/page.tsx` (ショップページ)

## 4. テスト

### 対象ファイル

| ファイル | 操作 | 内容 |
|----------|------|------|
| `src/components/__tests__/ConnectButton.test.tsx` | 新規作成 | JPYC残高表示のテスト |

### テストケース

#### ConnectButton

- 未接続時に「ウォレット接続」ボタンが表示される
- 接続済みでJPYC残高が表示される（モック値）
- 残高が3桁区切りカンマでフォーマットされる

※ RainbowKit の `ConnectButton.Custom` と wagmi hooks のモックが必要

## 5. 検証手順

1. `npm test` でテスト全PASS確認
2. 手動確認:
   - 商品詳細ページに売上分配セクションが表示されないこと
   - ダッシュボードの商品詳細では売上分配が表示されたままであること
   - MetaMask でウォレット接続後、ETHではなくJPYC残高が表示されること
   - JPYC残高が3桁区切りカンマ付きの整数で表示されること
   - ウォレット未接続時は「ウォレット接続」ボタンが表示されること
   - アドレス部分クリックでRainbowKitのアカウントモーダルが開くこと
