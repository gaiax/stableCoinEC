# 環境構築手順マニュアル

## 必要ツール

以下のツールを事前にインストールしてください。

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | v18以上 | JavaScript実行環境 |
| npm | v9以上 | パッケージ管理 |
| Docker / Docker Compose | 最新版 | ローカルPostgreSQLの起動 |
| MetaMask | 最新版 | ブラウザ拡張ウォレット |
| Git | 最新版 | バージョン管理 |

## セットアップ手順

### 1. リポジトリクローン

```bash
git clone <リポジトリURL>
cd stableCoinEC
```

### 2. パッケージインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成します。

```bash
cp .env.local.example .env.local
```

各変数を以下の手順で設定してください。

#### Database設定

ローカル開発ではデフォルト値のままで動作します。

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
```

#### Alchemy API Key の取得

1. [Alchemy Dashboard](https://dashboard.alchemy.com/) にアクセス
2. アカウント作成またはログイン
3. 「Create App」をクリック
4. Chain: Polygon, Network: Amoy を選択
5. 作成後、API Keyをコピーして `NEXT_PUBLIC_ALCHEMY_API_KEY` に設定

#### WalletConnect Project ID の取得

1. [WalletConnect Cloud](https://cloud.walletconnect.com/) にアクセス
2. アカウント作成またはログイン
3. 「New Project」をクリック
4. プロジェクト名を入力して作成
5. Project IDをコピーして `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` に設定

#### コントラクトアドレス

デプロイ後に `NEXT_PUBLIC_CONTRACT_ADDRESS` を設定します。初期段階ではゼロアドレスのままで問題ありません。

#### Admin Wallet 秘密鍵

商品登録のガス代支払い用ウォレットの秘密鍵を `ADMIN_PRIVATE_KEY` に設定します。

**注意: この秘密鍵は絶対に公開しないでください。本番環境では環境変数として安全に管理してください。**

#### API認証キー

`API_SECRET_KEY` に任意の文字列を設定します。商品登録APIの認証に使用されます。

### 4. PostgreSQLの起動

Docker Composeを使用してローカルのPostgreSQLを起動します。

```bash
docker-compose up -d
```

起動確認:

```bash
docker-compose ps
```

`stablecoinec_db` が `running` 状態であることを確認してください。

### 5. データベースマイグレーション

Prismaを使用してデータベーススキーマを適用します。

```bash
npx prisma migrate dev --name init
```

Prisma Clientの生成:

```bash
npx prisma generate
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして動作確認を行ってください。

## MetaMask の設定

### Polygon Amoy Testnetの追加

1. MetaMaskを開く
2. ネットワーク選択 > 「ネットワークを追加」
3. 以下の情報を入力:
   - ネットワーク名: Polygon Amoy Testnet
   - RPC URL: `https://rpc-amoy.polygon.technology/`
   - チェーンID: 80002
   - 通貨シンボル: MATIC
   - ブロックエクスプローラ: `https://amoy.polygonscan.com/`

### テスト用MATICの取得

[Polygon Faucet](https://faucet.polygon.technology/) からテスト用MATICを取得できます。

## トラブルシューティング

### PostgreSQLに接続できない

- Docker Composeが起動しているか確認: `docker-compose ps`
- ポート5432が他のプロセスで使用されていないか確認: `lsof -i :5432`

### Prisma migrate が失敗する

- `.env.local` の `DATABASE_URL` が正しいか確認
- PostgreSQLコンテナが起動しているか確認
- `npx prisma db push` で強制的にスキーマを同期することも可能

### npm run dev でエラーが出る

- `node_modules` を削除して再インストール: `rm -rf node_modules && npm install`
- Prisma Clientが生成されているか確認: `npx prisma generate`
