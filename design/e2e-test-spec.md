# E2Eテスト実装仕様書

## 概要

Playwright を使用した E2E（エンドツーエンド）テストの実装仕様。
WebブラウザのUIで完結するフローをテスト対象とし、MetaMask操作が必要なブロックチェーン連携（購入フロー）はスコープ外。

## テスト環境

| 項目 | 設定 |
|------|------|
| テストフレームワーク | Playwright |
| ブラウザ | Chromium のみ |
| ポート | 3001（テスト専用） |
| DB | `stablecoinec_test`（テスト専用PostgreSQL） |
| テストデータ | `prisma/seed.ts` のシードデータ |
| 並列実行 | 無効（`workers: 1`） |

## ファイル構成

```
playwright.config.ts        # Playwright設定
e2e/
├── helpers.ts              # 共通ヘルパー関数
├── auth.spec.ts            # 認証フロー (5テスト)
├── product-browsing.spec.ts # 商品閲覧 (4テスト)
├── seller-dashboard.spec.ts # 出品者ダッシュボード (6テスト)
├── mypage.spec.ts          # マイページ (3テスト)
└── address-management.spec.ts # 配送先管理 (3テスト)
```

## テストシナリオ一覧

### auth.spec.ts — 認証フロー (5テスト)

| # | テスト名 | 検証内容 |
|---|----------|----------|
| 1 | 購入者の新規登録 → 自動ログイン → ヘッダーに名前表示 | `/register` でフォーム入力 → `POST /api/auth/register` → 自動ログイン → `/` にリダイレクト → ヘッダーにユーザー名 |
| 2 | ログアウト → ヘッダーが未ログイン状態に戻る | ログイン → ログアウトボタンクリック → ヘッダーに「ログイン」「新規登録」リンク |
| 3 | ログイン → マイページ表示 | seed buyer でログイン → マイページにアカウント情報表示 |
| 4 | 出品者登録 → ダッシュボードにリダイレクト | `/register/seller` でフォーム入力 → `/dashboard` にリダイレクト |
| 5 | 不正なパスワードでログイン失敗 | 誤パスワード → エラーメッセージ表示 → URLは `/login` のまま |

### product-browsing.spec.ts — 商品閲覧 (4テスト)

| # | テスト名 | 検証内容 |
|---|----------|----------|
| 1 | トップページに商品一覧が表示される | `/` で「商品一覧」見出し + 「テスト商品A」+ 「1000 JPYC」 |
| 2 | 商品カードクリック → 商品詳細ページへ遷移 | 「詳細を見る」クリック → `/products/{id}` |
| 3 | 商品詳細ページに価格・説明・分配情報が表示される | 商品名、価格、説明、在庫、売上分配セクション |
| 4 | ショップページに商品が表示される | `/shops/demo-shop` でショップ名 + 商品表示 |

### seller-dashboard.spec.ts — 出品者ダッシュボード (6テスト)

| # | テスト名 | 検証内容 |
|---|----------|----------|
| 1 | ダッシュボードにサマリーカード表示 | 総売上・総注文数・未発送・発送済みカード |
| 2 | 商品管理セクションに商品が表示される | 商品管理セクション + テスト商品A |
| 3 | 商品詳細ページへのリンクが動作する | 商品クリック → `/dashboard/products/{id}` |
| 4 | ショップ設定ページの表示・保存 | 設定変更 → 保存 → 成功メッセージ → 元に戻す |
| 5 | 特商法設定ページの表示・保存 | 設定変更 → 保存 → 成功メッセージ → 元に戻す |
| 6 | 未ログインで /dashboard アクセス → /login にリダイレクト | 認証ミドルウェアによるリダイレクト確認 |

### mypage.spec.ts — マイページ (3テスト)

| # | テスト名 | 検証内容 |
|---|----------|----------|
| 1 | マイページにアカウント情報表示 | ユーザー名、メール、ロールバッジ |
| 2 | 配送先管理ページへのリンクが動作する | リンククリック → `/mypage/addresses` |
| 3 | 未ログインで /mypage アクセス → /login にリダイレクト | 認証ミドルウェアによるリダイレクト確認 |

### address-management.spec.ts — 配送先管理 (3テスト)

| # | テスト名 | 検証内容 |
|---|----------|----------|
| 1 | 新しい配送先を追加 → 一覧に表示される | フォーム入力 → 保存 → 一覧に反映 |
| 2 | 配送先を編集 → 変更が反映される | 編集ボタン → 宛名変更 → 保存 → 反映確認 |
| 3 | 配送先を削除 → 一覧から消える | 削除ボタン → confirm承認 → 一覧から削除 |

## 共通ヘルパー (e2e/helpers.ts)

| 関数 | 説明 |
|------|------|
| `login(page, email, password)` | 指定アカウントでログイン |
| `loginAsBuyer(page)` | buyer@example.com でログイン |
| `loginAsSeller(page)` | seller@example.com でログイン |
| `logout(page)` | ログアウト |
| `uniqueEmail()` | ユニークなメールアドレスを生成 |

## テスト用データ

`prisma/seed.ts` のシードデータを使用:

| データ | 値 |
|--------|-----|
| 出品者 | seller@example.com / password123 |
| 購入者 | buyer@example.com / password123 |
| ショップ | デモショップ (slug: demo-shop) |
| 商品 | テスト商品A (1000 JPYC, 在庫10, 公開中) |

新規登録テストでは `test-{timestamp}@example.com` 形式のユニークなメールアドレスを使用。

## E2E対象外

- **購入フロー（Approve→Buy）**: MetaMask操作が必要なためE2E対象外
- **商品登録フロー**: Admin Private Key によるオンチェーン登録を含むためE2E対象外
- **ウォレット接続**: RainbowKit/MetaMask のUI操作が必要なためE2E対象外

## 実行コマンド

```bash
# テスト用DB準備（初回のみ）
docker exec stablecoinec_db psql -U postgres -c "CREATE DATABASE stablecoinec_test;"
DATABASE_URL="...stablecoinec_test..." DIRECT_URL="...stablecoinec_test..." npx prisma migrate deploy
DATABASE_URL="...stablecoinec_test..." DIRECT_URL="...stablecoinec_test..." npx tsx prisma/seed.ts

# E2Eテスト実行
npx playwright test

# UIモードでデバッグ
npx playwright test --ui

# レポート表示
npx playwright show-report
```
