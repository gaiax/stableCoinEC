#!/bin/bash
set -e

# 使い方: ./scripts/switch-db.sh [single|mall]
#   single: 単店舗モード (stablecoinec_single DB)
#   mall:   モールモード (stablecoinec DB) ※デフォルト

MODE=${1:-mall}
ENV_LOCAL=".env.local"

DB_MALL="postgresql://postgres:password@localhost:5432/stablecoinec?schema=public"
DB_SINGLE="postgresql://postgres:password@localhost:5432/stablecoinec_single?schema=public"

if [ "$MODE" = "single" ]; then
  DB_URL="$DB_SINGLE"
  DB_NAME="stablecoinec_single"
  SEED_CMD="prisma/seed-single-shop.ts"
  echo "🏪 単店舗モードに切り替えます"
elif [ "$MODE" = "mall" ]; then
  DB_URL="$DB_MALL"
  DB_NAME="stablecoinec"
  SEED_CMD="prisma/seed.ts"
  echo "🏬 モールモードに切り替えます"
else
  echo "使い方: $0 [single|mall]"
  exit 1
fi

# DB作成（存在しない場合）
echo "  DB: $DB_NAME"
docker exec stablecoinec_db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  docker exec stablecoinec_db psql -U postgres -c "CREATE DATABASE $DB_NAME"

# .env.local の DATABASE_URL を書き換え
if [ -f "$ENV_LOCAL" ]; then
  if grep -q "^DATABASE_URL=" "$ENV_LOCAL"; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" "$ENV_LOCAL"
    rm -f "${ENV_LOCAL}.bak"
  else
    echo "DATABASE_URL=\"$DB_URL\"" >> "$ENV_LOCAL"
  fi
else
  echo "DATABASE_URL=\"$DB_URL\"" > "$ENV_LOCAL"
fi

# .env を一時退避（Prisma CLIが.envを独自に読み込んで上書きするため）
ENV_BAK=""
if [ -f ".env" ]; then
  ENV_BAK=".env.switch-bak"
  mv .env "$ENV_BAK"
fi

# マイグレーション適用
echo "  マイグレーション適用中..."
DATABASE_URL="$DB_URL" npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 | tail -1

# シードデータ投入
echo "  シードデータ投入中..."
DATABASE_URL="$DB_URL" npx tsx "$SEED_CMD"

# .env を復元
if [ -n "$ENV_BAK" ] && [ -f "$ENV_BAK" ]; then
  mv "$ENV_BAK" .env
fi

echo ""
echo "✅ $MODE モードに切り替えました"
echo "   Next.js 開発サーバーを再起動してください"
