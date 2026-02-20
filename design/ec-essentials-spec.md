# 実装仕様書: EC機能拡充 Phase 1 (feature/ec-essentials)

## 1. 概要

StableCoinECにECサイトとして必要な基盤機能を追加した。対象機能:

- 会員認証（NextAuth.js v5）
- 在庫管理
- 注文・発送管理
- 配送先管理
- 特定商取引法対応
- ショップ設定
- 画像アップロード・カルーセル表示
- 商品管理（編集・販売停止/再開）
- 購入者マイページ
- プライバシーポリシー・利用規約

## 2. 認証機能

### 技術構成

| 項目 | 内容 |
|------|------|
| ライブラリ | NextAuth.js v5 (beta) |
| Provider | Credentials（メール+パスワード） |
| ハッシュ | bcryptjs（ラウンド数: 12） |
| セッション | JWT（id, role, shopId を含む） |

### ファイル

- `src/lib/auth.ts` — NextAuth設定（callbacks: jwt/session）
- `src/types/next-auth.d.ts` — User, Session, JWT の型拡張
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth APIルート
- `src/app/api/auth/register/route.ts` — ユーザー登録API
- `src/middleware.ts` — /dashboard, /mypage 保護
- `src/app/providers.tsx` — SessionProvider 追加
- `src/components/AuthMenu.tsx` — ヘッダー認証メニュー

### ユーザー登録API (POST /api/auth/register)

- **BUYER登録:** email, password, name → User作成
- **SELLER登録:** email, password, name, shopName, shopSlug → User + Shop作成
  - `legalPaymentMethod` に「日本円ステーブルコインJPYCによる決済」を自動設定

### 認証ページ

- `/login` — ログインフォーム
- `/register` — 購入者登録フォーム
- `/register/seller` — 出品者登録フォーム（ショップ名・slug入力あり）

## 3. DBスキーマ拡張

### 新規モデル

| モデル | 説明 |
|--------|------|
| ProductImage | 商品追加画像（productId, imageUrl, sortOrder） |
| ShippingAddress | 配送先住所（userId, name, postalCode, prefecture, city, address1, address2, phone, isDefault） |

### 新規Enum

| Enum | 値 |
|------|-----|
| UserRole | BUYER, SELLER, ADMIN |
| ShippingStatus | UNSHIPPED, SHIPPED, DELIVERED |

### 既存モデルへの追加フィールド

**User:** passwordHash, role(UserRole), phone, shippingAddresses[], buyerOrders[], updatedAt

**Shop:** description, logoUrl, legalBusinessName, legalAddress, legalPhone, legalEmail, legalBusinessHours, legalShippingInfo, legalReturnPolicy, legalPaymentMethod, shippingFee, freeShippingThreshold, updatedAt

**Product:** stock(Int), images(ProductImage[]), updatedAt

**Order:** buyerId, buyer, shippingAddressId, shippingAddress, shippingFee, quantity, shippingStatus(ShippingStatus), trackingNumber, shippedAt, updatedAt

## 4. API仕様

### POST /api/auth/register — ユーザー登録

- **認証:** なし
- **リクエスト:** `{ email, password, name, role?, shopName?, shopSlug? }`
- **レスポンス:** `{ user: { id, email, name, role } }`
- **エラー:** 400（必須項目不足）、409（メール重複）

### POST /api/products/register — 商品登録

- **認証:** x-api-keyヘッダー
- **前提:** ショップの特商法必須4項目が設定済み
- **リクエスト:** `{ shopId, title, description?, imageUrl?, additionalImageUrls?, priceJPYC, stock?, splits[] }`
- **処理:** 特商法チェック → Admin Walletでコントラクト呼出 → DB保存
- **エラー:** 401, 400, 404, 500

### GET/PATCH /api/products/[id] — 商品詳細・更新

- **認証:** セッション + shop.ownerId照合
- **PATCH:** `{ title?, description?, imageUrl?, priceJPYC?, stock?, isPublished? }`
- **販売停止:** `{ isPublished: false }`
- **販売再開:** `{ isPublished: true }`

### POST /api/upload — 画像アップロード

- **認証:** セッション
- **形式:** multipart/form-data（fileフィールド）
- **制限:** 5MB、JPEG/PNG/WebP
- **保存先:** `public/uploads/products/`
- **レスポンス:** `{ imageUrl: "/uploads/products/xxx.jpg" }`

### POST /api/products/[id]/images — 追加画像登録

- **認証:** セッション + オーナー確認
- **リクエスト:** `{ imageUrl, sortOrder? }`
- **上限:** 4枚

### DELETE /api/products/[id]/images/[imageId] — 追加画像削除

- **認証:** セッション + オーナー確認

### POST /api/orders — 注文作成

- **リクエスト:** `{ productId, buyerAddress, buyerId?, shippingAddressId?, txHash, amountPaid, quantity? }`
- **処理:** 在庫チェック → Prisma $transaction（order作成 + stock減算）
- **エラー:** 400（在庫不足）

### PATCH /api/orders/[id]/ship — 発送処理

- **認証:** セッション + ショップオーナー確認
- **リクエスト:** `{ trackingNumber }`
- **処理:** shippingStatus→SHIPPED、shippedAt設定

### GET/PATCH /api/shops/[shopId]/settings — ショップ設定

- **認証:** セッション + オーナー確認
- **PATCH:** `{ name?, description?, shippingFee?, freeShippingThreshold? }`

### GET/PATCH /api/shops/[shopId]/legal — 特商法設定

- **認証:** セッション + オーナー確認
- **PATCH:** `{ legalBusinessName?, legalAddress?, legalPhone?, legalEmail?, legalBusinessHours?, legalShippingInfo?, legalReturnPolicy?, legalPaymentMethod? }`

### GET /api/shops/[shopId]/orders — ショップ注文一覧

- **認証:** セッション + オーナー確認
- **レスポンス:** 商品情報・購入者情報・配送先を含む注文配列

### GET /api/users/me/orders — 購入者注文履歴

- **認証:** セッション
- **検索:** buyerId OR walletAddress（後方互換性）

### CRUD /api/addresses — 配送先管理

- **認証:** セッション
- **GET:** ユーザーの配送先一覧
- **POST:** 新規作成 `{ name, postalCode, prefecture, city, address1, address2?, phone, isDefault? }`
- **PATCH /api/addresses/[id]:** 更新
- **DELETE /api/addresses/[id]:** 削除

## 5. フロントエンド実装

### 販売者ダッシュボード (/dashboard)

- **サマリーカード:** 総売上、総注文数、未発送数（黄色）、発送済み数（緑色）
- **最近の注文:** 商品名、購入者名、金額、発送状態バッジ
- **商品管理:** 商品一覧（リンク付き）+ 商品追加ボタン
- **売上分配設定:** 商品ごとの分配先・分配額
- **特商法未設定警告:** 黄色バナーで設定ページへ誘導

### 商品詳細・編集ページ (/dashboard/products/[id])

- **ProductDetailEditor コンポーネント（'use client'）**
- 各フィールド横に鉛筆ボタン → クリックでインライン編集フォーム → 保存/キャンセル
- 編集対象: 商品名、説明、画像URL、価格、在庫数
- 販売停止ボタン（赤）/ 販売再開ボタン（緑）
- 分配設定・オンチェーンID・注文情報は表示のみ

### 購入者マイページ (/mypage)

- 注文履歴一覧（発送状態バッジ: 黄=未発送、緑=発送済み、青=配達完了）
- 注文詳細ページ（追跡番号表示）
- 配送先管理（/mypage/addresses）

### CheckoutButton コンポーネント

- useSession() で buyerId を取得
- ログイン時: 配送先選択UI（既存アドレスのラジオ選択 + インライン新規作成）
- 配送先未選択時はバリデーションエラー
- Approve → Buy → 注文API呼出（buyerId, shippingAddressId 含む）

### ImageCarousel コンポーネント

- 外部ライブラリ不使用
- 左右矢印ナビゲーション + ドットインジケーター
- メイン画像 + 追加画像を結合表示
- 1枚の場合はシンプルな img 表示

## 6. 特商法対応

### 自動設定

出品者登録時に `legalPaymentMethod` =「日本円ステーブルコインJPYCによる決済」を設定

### 商品登録時チェック

以下の4項目が未設定の場合、商品登録を拒否（400エラー）:
- legalBusinessName（事業者名）
- legalAddress（住所）
- legalPhone（電話番号）
- legalEmail（メールアドレス）

### ダッシュボード警告

未設定時に黄色バナーで設定ページへ誘導

### 公開表示

`/shops/[slug]/legal` で購入者が特商法情報を閲覧可能

## 7. 在庫・発送管理

### 在庫管理

- Product.stock フィールド（デフォルト: 0）
- 購入時: 在庫チェック + Prisma $transaction で注文作成・stock減算
- stock = 0 で「SOLD OUT」バッジ表示 + 購入ボタン無効化

### 発送管理

- ShippingStatus: UNSHIPPED → SHIPPED → DELIVERED
- PATCH /api/orders/[id]/ship で発送処理（trackingNumber設定）
- バッジ色（全画面統一）:
  - UNSHIPPED: `bg-yellow-500 text-white`（黄色ベタ塗り）
  - SHIPPED: `bg-green-600 text-white`（緑色ベタ塗り）
  - DELIVERED: `bg-blue-600 text-white`（青色ベタ塗り）

## 8. 画像管理

### アップロードAPI

- POST /api/upload（FormData形式）
- 制限: 5MB、JPEG/PNG/WebP
- 保存先: `public/uploads/products/` + `crypto.randomUUID().ext`
- .gitignore に `public/uploads/` を追加

### ProductImage モデル

- 商品に最大4枚の追加画像
- sortOrder でソート
- Cascade削除（商品削除時に自動削除）

### カルーセル表示

- メイン画像（Product.imageUrl）+ 追加画像（ProductImage[]）を結合
- ImageCarousel コンポーネントで表示

## 9. テスト構成

### Jest（43テスト）

| テストファイル | テスト数 | 内容 |
|--------------|---------|------|
| products/register | 10 | API認証, バリデーション, 特商法チェック, 正常登録 |
| orders | 7 | 注文作成, 在庫チェック, バリデーション |
| orders/[id]/confirm | 4 | オンチェーン確認 |
| CheckoutButton | 7 | 表示, 配送先選択, 購入フロー, 在庫切れ |
| ProductCard | 4 | 表示, リンク |
| その他 | 11 | upload, products/[id], ImageCarousel 等 |

### Hardhat（11テスト）

JpycSplitMarketplace コントラクトのテスト（変更なし）。
