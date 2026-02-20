# E2Eテスト実行ガイド

## 概要

Playwright を使用した E2E テストの実行方法を説明します。
テスト対象は Web UI で完結するフロー（認証、商品閲覧、ダッシュボード操作、マイページ、配送先管理）です。

## 前提条件

- Docker が起動していること（PostgreSQL コンテナ）
- Node.js の依存パッケージがインストール済みであること
- Playwright のブラウザがインストール済みであること

## セットアップ（初回のみ）

### 1. Playwright ブラウザのインストール

```bash
npx playwright install chromium
```

### 2. テスト用データベースの作成

```bash
# テスト用DB作成
docker exec stablecoinec_db psql -U postgres -c "CREATE DATABASE stablecoinec_test;"
```

### 3. マイグレーション適用

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
npx prisma migrate deploy
```

### 4. シードデータ投入

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
npx tsx prisma/seed.ts
```

## テスト実行

### 全テスト実行

```bash
npx playwright test
```

### 特定のテストファイルのみ実行

```bash
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/product-browsing.spec.ts
npx playwright test e2e/seller-dashboard.spec.ts
npx playwright test e2e/mypage.spec.ts
npx playwright test e2e/address-management.spec.ts
```

### UIモードで実行（デバッグ用）

```bash
npx playwright test --ui
```

### HTMLレポート表示

```bash
npx playwright show-report
```

## テスト構成

| ファイル | テスト数 | 内容 |
|----------|----------|------|
| `e2e/auth.spec.ts` | 5 | 新規登録、ログイン、ログアウト、出品者登録、ログイン失敗 |
| `e2e/product-browsing.spec.ts` | 4 | 商品一覧、詳細遷移、詳細表示、ショップページ |
| `e2e/seller-dashboard.spec.ts` | 6 | サマリー、商品管理、設定、特商法、認証リダイレクト |
| `e2e/mypage.spec.ts` | 3 | アカウント情報、配送先リンク、認証リダイレクト |
| `e2e/address-management.spec.ts` | 3 | 配送先の追加・編集・削除 |
| **合計** | **21** | |

## テスト用アカウント

| 種別 | メールアドレス | パスワード |
|------|---------------|-----------|
| 出品者 | seller@example.com | password123 |
| 購入者 | buyer@example.com | password123 |

## 設定ファイル

- **playwright.config.ts**: テスト設定（baseURL: localhost:3001、Chromiumのみ、webServer自動起動）
- **e2e/helpers.ts**: ログインヘルパー等の共通関数

## テスト用DBのリセット

テストデータが汚れた場合は以下で初期化できます:

```bash
# DB削除→再作成
docker exec stablecoinec_db psql -U postgres -c "DROP DATABASE stablecoinec_test;"
docker exec stablecoinec_db psql -U postgres -c "CREATE DATABASE stablecoinec_test;"

# マイグレーション再適用 + シード
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
npx prisma migrate deploy

DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec_test?schema=public" \
npx tsx prisma/seed.ts
```

## トラブルシューティング

### `@react-native-async-storage/async-storage` / `pino-pretty` の警告

MetaMask SDK / WalletConnect のオプション依存であり、テスト動作に影響ありません。無視してください。

### テストがタイムアウトする

- PostgreSQL コンテナが起動しているか確認: `docker-compose ps`
- ポート 3001 が使用中でないか確認: `lsof -i :3001`
- テスト用DBにシードデータが投入されているか確認

### テスト用DBに接続できない

- Docker コンテナが起動しているか確認
- `stablecoinec_test` データベースが存在するか確認:
  ```bash
  docker exec stablecoinec_db psql -U postgres -l | grep stablecoinec_test
  ```
