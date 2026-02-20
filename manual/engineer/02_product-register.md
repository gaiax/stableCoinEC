# 商品登録マニュアル

## 前提条件

- 環境構築が完了していること（`manual/01_setup.md` 参照）
- スマートコントラクトがデプロイ済みであること
- `.env.local` に以下が正しく設定されていること:
  - `NEXT_PUBLIC_CONTRACT_ADDRESS` : デプロイ済みコントラクトアドレス
  - `ADMIN_PRIVATE_KEY` : 運営ウォレットの秘密鍵（ガス代支払い用）
  - `API_SECRET_KEY` : API認証キー

## 商品登録の仕組み

商品登録はAPI経由で行います。運営（Admin）ウォレットがガス代を負担し、スマートコントラクトの `registerProduct` 関数を呼び出します。出品者はガス代を支払う必要がありません。

### フロー

1. 出品者が商品情報と分配設定を入力
2. `/api/products/register` にリクエスト送信
3. サーバーサイドでAdmin Walletがコントラクトを呼び出し
4. トランザクション成功後、DBに商品情報を保存

## API仕様

### エンドポイント

```
POST /api/products/register
```

### ヘッダー

| ヘッダー | 値 | 必須 |
|---------|-----|------|
| Content-Type | application/json | はい |
| x-api-key | API_SECRET_KEY の値 | はい |

### リクエストボディ

```json
{
  "shopId": "ショップID",
  "title": "商品名",
  "description": "商品説明（任意）",
  "imageUrl": "商品画像URL（任意）",
  "priceJPYC": 1000,
  "splits": [
    {
      "recipientAddress": "0xAAA...",
      "percentage": 8000
    },
    {
      "recipientAddress": "0xBBB...",
      "percentage": 2000
    }
  ]
}
```

### パラメータ説明

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| shopId | string | はい | 商品を登録するショップのID |
| title | string | はい | 商品名 |
| description | string | いいえ | 商品の説明 |
| imageUrl | string | いいえ | 商品画像のURL |
| priceJPYC | number | はい | JPYC建ての価格 |
| stock | number | いいえ | 在庫数（デフォルト: 0） |
| additionalImageUrls | string[] | いいえ | 追加画像URLの配列（最大4枚、`/api/upload` で取得したパス） |
| splits | array | はい | 売上分配設定（1件以上） |

### Split設定

`splits` は売上の分配先と割合を指定する配列です。

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| recipientAddress | string | 分配先のEOAアドレス（0x...） |
| percentage | number | 分配割合（ベーシスポイント） |

**分配割合の単位: ベーシスポイント（Basis Points）**

- 10000 = 100%
- 5000 = 50%
- 8000 = 80%
- 2000 = 20%

**全splitsのpercentage合計は必ず10000（100%）になる必要があります。**

### レスポンス例

成功時（200）:

```json
{
  "success": true,
  "product": {
    "id": "clxxxxxxxxxx",
    "shopId": "clxxxxxxxxxx",
    "title": "商品名",
    "description": "商品説明",
    "imageUrl": null,
    "priceJPYC": "1000",
    "isPublished": true,
    "txHash": "0xabc...",
    "splits": [
      {
        "id": "clxxxxxxxxxx",
        "recipientAddress": "0xAAA...",
        "percentage": 8000
      }
    ]
  },
  "txHash": "0xabc..."
}
```

エラー時:

```json
{
  "error": "エラーメッセージ"
}
```

### 前提条件: 特商法の設定

商品登録前に、ショップの特定商取引法に基づく表記（以下4項目）が設定済みである必要があります:
- `legalBusinessName`（事業者名）
- `legalAddress`（住所）
- `legalPhone`（電話番号）
- `legalEmail`（メールアドレス）

未設定の場合、400エラーが返されます。設定は `PATCH /api/shops/[shopId]/legal` で行います。

### エラーコード

| ステータス | エラー | 原因 |
|-----------|--------|------|
| 401 | Unauthorized | x-api-key が不正 |
| 400 | Missing required fields | 必須パラメータが不足 |
| 400 | Split percentages must total 10000 basis points | 分配割合の合計が10000でない |
| 400 | 特定商取引法に基づく表記...の設定が必要です | 特商法の必須項目が未設定 |
| 404 | ショップが見つかりません | shopId に対応するショップが存在しない |
| 500 | Contract address not configured | コントラクトアドレスが未設定 |
| 500 | Transaction failed | オンチェーントランザクションが失敗 |
| 500 | Internal server error | サーバー内部エラー |

## 使用例（curl）

```bash
curl -X POST http://localhost:3000/api/products/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-here" \
  -d '{
    "shopId": "your-shop-id",
    "title": "テスト商品",
    "description": "テスト用の商品です",
    "priceJPYC": 1000,
    "splits": [
      {
        "recipientAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "percentage": 8000
      },
      {
        "recipientAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "percentage": 2000
      }
    ]
  }'
```

## 画像アップロードAPI

商品画像は事前にアップロードして URL を取得し、商品登録リクエストに含めます。

### エンドポイント

```
POST /api/upload
```

### リクエスト

`multipart/form-data` 形式。`file` フィールドに画像ファイルを添付。

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: <セッションCookie>" \
  -F "file=@product-image.jpg"
```

### 制限

- ファイルサイズ: 最大 5MB
- 対応形式: JPEG, PNG, WebP
- 認証: セッション認証が必要

### レスポンス

```json
{ "imageUrl": "/uploads/products/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg" }
```

## 追加画像API

### 追加画像の登録

```
POST /api/products/[id]/images
Content-Type: application/json
```

```json
{ "imageUrl": "/uploads/products/xxx.jpg", "sortOrder": 0 }
```

### 追加画像の削除

```
DELETE /api/products/[id]/images/[imageId]
```

## 注意事項

- 商品登録にはAdmin Walletにガス代（MATIC）が必要です。残高が不足しているとトランザクションが失敗します。
- Amoy Testnetでは [Polygon Faucet](https://faucet.polygon.technology/) からテスト用MATICを取得できます。
- 一度登録した商品のオンチェーン情報（価格・分配先）は変更できません。変更する場合は新しい商品として再登録してください。
- DB上の商品情報（タイトル、説明、在庫数、販売状態）は `PATCH /api/products/[id]` で変更可能です。
