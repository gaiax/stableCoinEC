# ショップ・商品管理マニュアル

## 認証

すべてのAPIはセッション認証が必要です。さらに、ショップの `ownerId` がログインユーザーの `id` と一致することを確認します（403エラー）。

## ショップ設定API

### 取得

```
GET /api/shops/[shopId]/settings
```

### 更新

```
PATCH /api/shops/[shopId]/settings
Content-Type: application/json
```

```json
{
  "name": "新しいショップ名",
  "description": "ショップの説明",
  "shippingFee": "500",
  "freeShippingThreshold": "5000"
}
```

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| name | string | ショップ名（空文字不可） |
| description | string \| null | 説明 |
| shippingFee | string \| null | 全国一律送料（null=送料無料） |
| freeShippingThreshold | string \| null | この金額以上で送料無料（null=無効） |

## 特商法設定API

### 取得

```
GET /api/shops/[shopId]/legal
```

### 更新

```
PATCH /api/shops/[shopId]/legal
Content-Type: application/json
```

```json
{
  "legalBusinessName": "テスト株式会社",
  "legalAddress": "東京都渋谷区テスト1-2-3",
  "legalPhone": "03-1234-5678",
  "legalEmail": "legal@example.com",
  "legalBusinessHours": "平日 10:00〜18:00",
  "legalShippingInfo": "注文から3営業日以内に発送",
  "legalReturnPolicy": "商品到着後7日以内であれば返品可能",
  "legalPaymentMethod": "日本円ステーブルコインJPYCによる決済"
}
```

**必須4項目**（商品登録に必要）: `legalBusinessName`, `legalAddress`, `legalPhone`, `legalEmail`

## 商品管理API

### 商品詳細取得

```
GET /api/products/[id]
```

レスポンスに `splits` と `images` を含みます。

### 商品情報更新

```
PATCH /api/products/[id]
Content-Type: application/json
```

更新可能なフィールド:

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| title | string | 商品名（空文字不可） |
| description | string \| null | 説明 |
| imageUrl | string \| null | メイン画像URL |
| priceJPYC | string | 価格（0より大きい数値） |
| stock | number | 在庫数（0以上） |
| isPublished | boolean | 販売状態 |

### 販売停止

```bash
curl -X PATCH http://localhost:3000/api/products/[id] \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"isPublished": false}'
```

### 販売再開

```bash
curl -X PATCH http://localhost:3000/api/products/[id] \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"isPublished": true}'
```

### エラーコード

| ステータス | エラー | 原因 |
|-----------|--------|------|
| 401 | 認証が必要です | 未ログイン |
| 403 | この商品を編集する権限がありません | 他人の商品 |
| 404 | 商品が見つかりません | 存在しない商品ID |
| 400 | 商品名は必須です | title が空 |
| 400 | 価格は0より大きい数値... | priceJPYC が不正 |
| 400 | 在庫数は0以上... | stock が負の数 |

## curl 使用例

```bash
# ログイン（事前準備）
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "email=seller@example.com&password=password123&csrfToken=$CSRF" \
  -c cookies.txt -L

# ショップ設定取得
curl http://localhost:3000/api/shops/[shopId]/settings -b cookies.txt

# 特商法設定
curl -X PATCH http://localhost:3000/api/shops/[shopId]/legal \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"legalBusinessName":"テスト会社","legalAddress":"東京都...","legalPhone":"03-1234-5678","legalEmail":"test@example.com"}'

# 商品の在庫更新
curl -X PATCH http://localhost:3000/api/products/[productId] \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"stock": 50}'
```
