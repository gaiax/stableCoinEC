# 実装仕様書: ショップページ強化・トップページリニューアル

## 概要

ショップページの機能強化（カバー画像、ショップ情報、特商法リンク、ナビゲーション）と、トップページを新着商品カルーセル＋ショップ一覧に刷新。ショップ数に応じて単店舗モード/モールモードを自動切替。

## 対象ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `prisma/schema.prisma` | 変更 | Shop モデルに `coverImageUrl` 追加 |
| `src/app/page.tsx` | 変更 | トップページ: 新着カルーセル+ショップ一覧 / 単店舗リダイレクト |
| `src/app/layout.tsx` | 変更 | ヘッダーから「商品一覧」リンクを削除 |
| `src/app/shops/[slug]/page.tsx` | 変更 | カバー画像、ショップ説明、ショップ情報セクション、特商法リンク |
| `src/app/products/[id]/page.tsx` | 変更 | ショップ名をリンクに変更 |
| `src/components/ProductCard.tsx` | 変更 | `use client` 化、ショップ名リンク追加、ネスト `<a>` 回避 |
| `src/components/ShopSettingsForm.tsx` | 変更 | カバー画像アップロード/プレビュー/削除UI |
| `src/app/api/shops/[shopId]/settings/route.ts` | 変更 | `coverImageUrl` の GET/PATCH 対応 |
| `src/app/dashboard/settings/page.tsx` | 変更 | `coverImageUrl` をフォームに渡す |
| `src/app/globals.css` | 変更 | `scrollbar-hide` ユーティリティ追加 |
| `e2e/product-browsing.spec.ts` | 変更 | カードクリック方法の修正 |
| `src/components/__tests__/ProductCard.test.tsx` | 変更 | shopSlug リンクテスト追加 |

## 機能詳細

### 1. トップページの単店舗/モール切り替え

```
ショップ数 == 1 → redirect(`/shops/${slug}`)  (単店舗モード)
ショップ数 >= 2 → 新着商品 + ショップ一覧表示 (モールモード)
ショップ数 == 0 → 「まだ商品がありません」「まだショップがありません」
```

### 2. 新着商品カルーセル

- 最新8件を取得 (`take: 8, orderBy: { createdAt: 'desc' }`)
- 横スクロール: `overflow-x-auto` + `flex` レイアウト
- カード幅: `w-48`（モバイル）/ `w-56`（md以上）
- スクロールバー非表示: `scrollbar-hide` カスタムユーティリティ

### 3. ショップ一覧

- 全ショップを取得（公開商品数のカウント付き）
- レイアウト: 左カラム（ロゴ画像 丸型 64×64px）+ 右カラム（ショップ名、説明、商品数）
- ロゴ未設定時: 頭文字をフォールバック表示
- カード全体がリンク → `/shops/[slug]`

### 4. ショップカバー画像

**データベース:**
- `Shop.coverImageUrl: String?` を追加（マイグレーション済み）

**アップロード:**
- 既存の `/api/upload` を利用（JPEG/PNG/WebP、5MB以下）
- `ShopSettingsForm` にプレビュー + 削除ボタン
- 保存時に `coverImageUrl` を PATCH 送信

**表示（ショップページ）:**
- カバー画像あり: 全幅ヒーロー (`h-48 md:h-64`)、グラデーションオーバーレイ、白文字ショップ名（ドロップシャドウ）
- カバー画像なし: テキストのみのヘッダー

### 5. ショップ情報セクション

ショップページ下部（フッターの上）に表示:
- 店名、連絡先（メール）、電話番号、営業時間
- 特商法: `/shops/[slug]/legal` へのリンク（`legalBusinessName` 設定済みの場合のみ表示）

### 6. ナビゲーションリンク

- **ProductCard**: ショップ名クリック → ショップページ（`stopPropagation` で商品詳細遷移と分離）
- **商品詳細ページ**: ショップ名クリック → ショップページ
- **ヘッダー**: 「商品一覧」リンク削除（ロゴクリックでトップに戻る）

### 7. ProductCard の構造変更

ネストした `<a>` タグ（HTMLバリデーションエラー）を回避するため:
- 外側: `<Link>` → `<div>` + `onClick` + `useRouter().push()`
- ショップ名: `<Link>` + `stopPropagation()`
- `'use client'` ディレクティブ追加

## テスト

### ユニットテスト（Jest）
- `ProductCard.test.tsx`: shopSlug リンク表示/非表示、カードクリック遷移

### E2Eテスト（Playwright）
- `product-browsing.spec.ts`: 商品カードクリック方法を `text=テスト商品A` に修正
