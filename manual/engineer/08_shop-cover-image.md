# エンジニア向けマニュアル: ショップカバー画像・トップページ

## 1. データベース

### マイグレーション

`coverImageUrl` カラムが Shop テーブルに追加されています。

```bash
npx prisma migrate dev
```

既存環境で実行すると `20260311045451_add_shop_cover_image` が適用されます。

### Prisma Client 再生成

マイグレーション後、Prisma Client の型を更新します。

```bash
npx prisma generate
```

**注意:** Next.js 開発サーバーの再起動が必要です。

## 2. ショップカバー画像

### アップロードフロー

1. 販売者がダッシュボード → ショップ設定を開く
2. 「カバー画像」セクションで画像ファイルを選択
3. `/api/upload` に POST → `public/uploads/products/` に保存
4. プレビューが表示される
5. 「設定を保存する」をクリック → `/api/shops/[shopId]/settings` に PATCH
6. `coverImageUrl` が DB に保存される

### API

**PATCH `/api/shops/[shopId]/settings`**

リクエストボディに `coverImageUrl` を追加:

```json
{
  "name": "ショップ名",
  "coverImageUrl": "/uploads/products/uuid.jpg",
  ...
}
```

`coverImageUrl` に `null` または空文字を送ると画像が削除されます。

## 3. トップページの動的切り替え

`src/app/page.tsx` でショップ数に応じて動作が変わります。

| ショップ数 | 動作 |
|-----------|------|
| 0 | 空メッセージを表示 |
| 1 | `/shops/[slug]` にリダイレクト（単店舗モード） |
| 2以上 | 新着商品カルーセル + ショップ一覧（モールモード） |

### 単店舗モードのテスト

シードデータではショップが1つのため、トップページアクセス時にショップページにリダイレクトされます。

モールモードをテストするには、2つ目のショップを作成してください:

```bash
# 2人目の販売者を登録（UIまたはAPIから）
# /register/seller で新規出品者登録
```

## 4. ProductCard の構造

`ProductCard` は `'use client'` コンポーネントです。

- カードクリック: `useRouter().push()` で商品詳細に遷移
- ショップ名リンク: `<Link>` + `stopPropagation()` でショップページに遷移

Server Component (`page.tsx`) からインポートして使えますが、`'use client'` バウンダリが発生します。

## 5. CSS ユーティリティ

`globals.css` に `scrollbar-hide` を追加:

```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

新着商品カルーセルの横スクロールバーを非表示にするために使用。
