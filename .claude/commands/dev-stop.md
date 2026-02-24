ローカル開発環境を停止してください。

手順:
1. Hardhat Nodeを停止する: `pkill -f "hardhat node"` を実行し、プロセスが終了したか確認する
2. Next.jsを停止する: `pkill -f "next dev"` を実行し、プロセスが終了したか確認する
3. `docker-compose stop` でPostgreSQLを停止する
4. 各サービスの停止結果をユーザーに報告する
