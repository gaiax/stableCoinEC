# 注文・発送・配送先管理マニュアル

## 注文管理

### ショップの注文一覧

```
GET /api/shops/[shopId]/orders
```

セッション認証 + ショップオーナー確認が必要。商品情報・購入者情報・配送先情報を含む注文一覧を返します。

### 発送処理

```
PATCH /api/orders/[id]/ship
Content-Type: application/json
```

```json
{
  "trackingNumber": "1234-5678-9012"
}
```

- `shippingStatus` を `SHIPPED` に更新
- `shippedAt` に現在時刻を設定
- `trackingNumber` を保存

認証: セッション認証 + 注文の商品がログインユーザーのショップに属することを確認。

### オンチェーン注文確認

```
POST /api/orders/[id]/confirm
```

トランザクションハッシュを使ってオンチェーンでの決済完了を確認し、`status` を `CONFIRMED` に更新。

## ShippingStatus フロー

```
UNSHIPPED → SHIPPED → DELIVERED
```

| ステータス | 意味 | バッジ色 |
|-----------|------|---------|
| UNSHIPPED | 未発送 | 黄色 |
| SHIPPED | 発送済み | 緑色 |
| DELIVERED | 配達完了 | 青色 |

## 購入者注文履歴

```
GET /api/users/me/orders
```

セッション認証が必要。ログインユーザーの `buyerId` またはウォレットアドレスに紐づく注文を返します（後方互換性のため OR 検索）。

## 配送先管理API

### 一覧取得

```
GET /api/addresses
```

### 新規作成

```
POST /api/addresses
Content-Type: application/json
```

```json
{
  "name": "山田太郎",
  "postalCode": "150-0001",
  "prefecture": "東京都",
  "city": "渋谷区",
  "address1": "神宮前1-2-3",
  "address2": "テストビル101",
  "phone": "090-1234-5678",
  "isDefault": true
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | はい | 宛名 |
| postalCode | string | はい | 郵便番号 |
| prefecture | string | はい | 都道府県 |
| city | string | はい | 市区町村 |
| address1 | string | はい | 住所1 |
| address2 | string | いいえ | 住所2（建物名等） |
| phone | string | はい | 電話番号 |
| isDefault | boolean | いいえ | デフォルト住所に設定 |

### 個別取得・更新・削除

```
GET    /api/addresses/[id]
PATCH  /api/addresses/[id]
DELETE /api/addresses/[id]
```

## curl 使用例

```bash
# ログイン（事前準備）
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "email=seller@example.com&password=password123&csrfToken=$CSRF" \
  -c cookies.txt -L

# ショップの注文一覧取得
curl http://localhost:3000/api/shops/[shopId]/orders -b cookies.txt

# 発送処理
curl -X PATCH http://localhost:3000/api/orders/[orderId]/ship \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"trackingNumber": "1234-5678-9012"}'

# 購入者の注文履歴（購入者でログイン後）
curl http://localhost:3000/api/users/me/orders -b cookies.txt

# 配送先の追加
curl -X POST http://localhost:3000/api/addresses \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"山田太郎","postalCode":"150-0001","prefecture":"東京都","city":"渋谷区","address1":"神宮前1-2-3","phone":"090-1234-5678"}'

# 配送先の削除
curl -X DELETE http://localhost:3000/api/addresses/[addressId] -b cookies.txt
```
