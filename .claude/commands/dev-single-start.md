単店舗モードでローカル開発環境を起動してください。Next.jsは起動しません。

手順:
1. `docker-compose up -d` でPostgreSQLを起動する
2. `./scripts/switch-db.sh single` を実行して単店舗モードDBに切り替える
3. `/tmp/dev-mode` ファイルに `single` と書き込む（停止時にモード判定するため）: `echo "single" > /tmp/dev-mode`
4. `cd contracts && npx hardhat node > /tmp/hardhat-node.log 2>&1 &` でHardhat Nodeをバックグラウンド起動する
5. Hardhat Nodeの起動を待つ（数秒待ってから `curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'` で確認）
6. `cd contracts && npx hardhat run scripts/deploy-local.ts --network localhost` でコントラクトをデプロイする
7. 出力されたコントラクトアドレス・JPYCアドレスを `.env.local` の `NEXT_PUBLIC_CONTRACT_ADDRESS` と `NEXT_PUBLIC_JPYC_ADDRESS` に反映するよう案内する
8. `.env.local` に `NEXT_PUBLIC_CHAIN=localhost` が設定されているか確認し、なければ追加するよう案内する
9. 起動完了をユーザーに伝える（単店舗モードであること、Next.jsは `npm run dev` で別途起動する旨も伝える）
