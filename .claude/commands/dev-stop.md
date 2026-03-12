ローカル開発環境を停止してください。

手順:
1. Hardhat Nodeを停止する: `pkill -f "hardhat node"` を実行し、プロセスが終了したか確認する
2. Next.jsを停止する: `pkill -f "next dev"` を実行し、プロセスが終了したか確認する
3. `/tmp/dev-mode` ファイルの内容を確認する。`single` と書かれていた場合:
   - `./scripts/switch-db.sh mall` を実行してモールモード（通常DB）に復帰する
   - `/tmp/dev-mode` ファイルを削除する: `rm -f /tmp/dev-mode`
   - 「モールモードに復帰しました」とユーザーに伝える
4. `/tmp/dev-mode` ファイルが存在しない、または `single` でない場合はDB切り替えは不要
5. `docker-compose stop` でPostgreSQLを停止する
6. 各サービスの停止結果をユーザーに報告する
