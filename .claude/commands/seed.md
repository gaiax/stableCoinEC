データベースをリセットしてシードデータを投入してください。

手順:
1. Docker PostgreSQL が起動中か確認（`docker-compose ps`）。停止中なら `docker-compose up -d` で起動
2. `npx prisma migrate reset --force` でDBをリセット（マイグレーション再適用 + シード実行）
3. 投入されたデータの確認: `npx prisma studio` の起動を案内する
