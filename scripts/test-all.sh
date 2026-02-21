#!/usr/bin/env bash
# ==============================================================================
# scripts/test-all.sh
# テスト環境を分離して全テスト (Jest + Playwright) を実行するスクリプト
#
# 処理フロー:
#   1. .env / .env.local をバックアップ
#   2. テスト用DB作成 + マイグレーション + シード
#   3. Hardhat ノード起動 (バックグラウンド)
#   4. コントラクトデプロイ → アドレス取得
#   5. .env.test 生成 → .env / .env.local に上書き
#   6. Jest ユニットテスト実行
#   7. Playwright E2E テスト実行
#   8. クリーンアップ (.env復元、Hardhatノード停止)
# ==============================================================================
set -euo pipefail

# ─── 定数 ───────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
HARDHAT_PID=""
JEST_EXIT=0
PLAYWRIGHT_EXIT=0
CLEANUP_DONE=false

# テストDB設定
TEST_DB_NAME="stablecoinec_test"
DB_CONTAINER="stablecoinec_db"
DB_USER="postgres"
DB_PASSWORD="password"
TEST_DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${TEST_DB_NAME}?schema=public"

# ─── カラー出力ヘルパー ────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; }

# ─── クリーンアップ関数 ────────────────────────────────────
cleanup() {
  if [ "$CLEANUP_DONE" = true ]; then
    return
  fi
  CLEANUP_DONE=true

  echo ""
  info "========== クリーンアップ開始 =========="

  # Hardhat ノード停止
  if [ -n "$HARDHAT_PID" ] && kill -0 "$HARDHAT_PID" 2>/dev/null; then
    info "Hardhat ノードを停止中 (PID: $HARDHAT_PID)..."
    kill "$HARDHAT_PID" 2>/dev/null || true
    wait "$HARDHAT_PID" 2>/dev/null || true
    success "Hardhat ノード停止完了"
  fi

  # .env 復元
  if [ -f "$PROJECT_ROOT/.env.bak" ]; then
    cp "$PROJECT_ROOT/.env.bak" "$PROJECT_ROOT/.env"
    rm -f "$PROJECT_ROOT/.env.bak"
    success ".env を復元しました"
  fi

  if [ -f "$PROJECT_ROOT/.env.local.bak" ]; then
    cp "$PROJECT_ROOT/.env.local.bak" "$PROJECT_ROOT/.env.local"
    rm -f "$PROJECT_ROOT/.env.local.bak"
    success ".env.local を復元しました"
  fi

  # 一時ファイル削除
  rm -f "$PROJECT_ROOT/.env.test"

  info "========== クリーンアップ完了 =========="

  # 結果サマリー
  echo ""
  echo "==========================================="
  echo "  テスト結果サマリー"
  echo "==========================================="
  if [ "$JEST_EXIT" -eq 0 ]; then
    echo -e "  Jest (Unit):     ${GREEN}PASS${NC}"
  else
    echo -e "  Jest (Unit):     ${RED}FAIL (exit: $JEST_EXIT)${NC}"
  fi
  if [ "$PLAYWRIGHT_EXIT" -eq 0 ]; then
    echo -e "  Playwright (E2E): ${GREEN}PASS${NC}"
  else
    echo -e "  Playwright (E2E): ${RED}FAIL (exit: $PLAYWRIGHT_EXIT)${NC}"
  fi
  echo "==========================================="

  if [ "$JEST_EXIT" -ne 0 ] || [ "$PLAYWRIGHT_EXIT" -ne 0 ]; then
    echo -e "  ${RED}テスト失敗あり${NC}"
  else
    echo -e "  ${GREEN}全テスト成功${NC}"
  fi
  echo ""
}

# trap で終了時に必ずクリーンアップ
trap cleanup EXIT INT TERM

# ─── メイン処理 ──────────────────────────────────────────
cd "$PROJECT_ROOT"

echo ""
echo "==========================================="
echo "  StableCoinEC テスト一括実行"
echo "==========================================="
echo ""

# ─── 1. .env バックアップ ──────────────────────────────────
info "Step 1: .env ファイルをバックアップ"

if [ -f .env ]; then
  cp .env .env.bak
  success ".env → .env.bak"
else
  warn ".env が見つかりません (新規作成されます)"
  touch .env.bak
fi

if [ -f .env.local ]; then
  cp .env.local .env.local.bak
  success ".env.local → .env.local.bak"
else
  warn ".env.local が見つかりません (新規作成されます)"
  touch .env.local.bak
fi

# ─── 2. テスト用DB セットアップ ─────────────────────────────
info "Step 2: テスト用データベースをセットアップ"

# DB作成 (既存なら無視)
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null || true
success "テストDB: ${TEST_DB_NAME}"

# マイグレーション適用
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" npx prisma migrate deploy
success "マイグレーション適用完了"

# シードデータ投入
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" npx tsx prisma/seed.ts
success "シードデータ投入完了"

# ─── 3. Hardhat ノード起動 ────────────────────────────────
info "Step 3: Hardhat ノードを起動"

cd "$CONTRACTS_DIR"
npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!
cd "$PROJECT_ROOT"

info "Hardhat ノード起動待機中 (PID: $HARDHAT_PID)..."

# localhost:8545 が応答するまでポーリング (最大30秒)
WAIT_COUNT=0
MAX_WAIT=30
while ! curl -sf http://localhost:8545 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; do
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [ "$WAIT_COUNT" -ge "$MAX_WAIT" ]; then
    error "Hardhat ノードの起動がタイムアウトしました (${MAX_WAIT}秒)"
    exit 1
  fi
done

success "Hardhat ノード起動完了 (${WAIT_COUNT}秒)"

# ─── 4. コントラクトデプロイ ───────────────────────────────
info "Step 4: コントラクトをローカルデプロイ"

cd "$CONTRACTS_DIR"
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy-local.ts --network localhost 2>&1)
cd "$PROJECT_ROOT"

# アドレスをパース
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep 'NEXT_PUBLIC_CONTRACT_ADDRESS=' | sed 's/.*NEXT_PUBLIC_CONTRACT_ADDRESS="\(.*\)"/\1/')
JPYC_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep 'NEXT_PUBLIC_JPYC_ADDRESS=' | sed 's/.*NEXT_PUBLIC_JPYC_ADDRESS="\(.*\)"/\1/')

if [ -z "$CONTRACT_ADDRESS" ] || [ -z "$JPYC_ADDRESS" ]; then
  error "コントラクトアドレスの取得に失敗しました"
  echo "Deploy output:"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

success "Contract: $CONTRACT_ADDRESS"
success "JPYC:     $JPYC_ADDRESS"

# ─── 5. .env.test 生成 & スワップ ──────────────────────────
info "Step 5: テスト用 .env を生成"

cat > .env.test << EOF
DATABASE_URL="${TEST_DB_URL}"
DIRECT_URL="${TEST_DB_URL}"
NEXT_PUBLIC_ALCHEMY_API_KEY="test-key"
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="test-project-id"
NEXT_PUBLIC_CHAIN="localhost"
NEXT_PUBLIC_CONTRACT_ADDRESS="${CONTRACT_ADDRESS}"
NEXT_PUBLIC_JPYC_ADDRESS="${JPYC_ADDRESS}"
ADMIN_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
API_SECRET_KEY="test-api-secret-key"
AUTH_SECRET="test-auth-secret-key"
AUTH_URL="http://localhost:3000"
EOF

cp .env.test .env
cp .env.test .env.local
success ".env.test → .env / .env.local に適用"

# ─── 6. Jest ユニットテスト ────────────────────────────────
info "Step 6: Jest ユニットテストを実行"
echo ""

set +e
npm test 2>&1
JEST_EXIT=$?
set -e

echo ""
if [ "$JEST_EXIT" -eq 0 ]; then
  success "Jest テスト: PASS"
else
  warn "Jest テスト: FAIL (exit: $JEST_EXIT)"
fi

# ─── 7. Playwright E2E テスト ─────────────────────────────
info "Step 7: Playwright E2E テストを実行"
echo ""

set +e
npx playwright test 2>&1
PLAYWRIGHT_EXIT=$?
set -e

echo ""
if [ "$PLAYWRIGHT_EXIT" -eq 0 ]; then
  success "Playwright テスト: PASS"
else
  warn "Playwright テスト: FAIL (exit: $PLAYWRIGHT_EXIT)"
fi

# ─── 終了 (cleanup は trap で自動実行) ─────────────────────
# 全テスト失敗なら非ゼロで終了
if [ "$JEST_EXIT" -ne 0 ] || [ "$PLAYWRIGHT_EXIT" -ne 0 ]; then
  exit 1
fi

exit 0
