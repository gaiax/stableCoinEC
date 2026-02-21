すべてのテスト（コントラクト・ユニット・E2E）を実行してください。

手順:
1. **コントラクトテスト**: `cd contracts && npx hardhat test` を実行し結果を報告
2. **統合テスト（Jest + Playwright E2E）**: `npm run test:all` を実行し結果を報告
   - このコマンドは `scripts/test-all.sh` を実行し、以下を自動で行う:
     - .env / .env.local をバックアップしてテスト用に差し替え
     - テスト用DB（stablecoinec_test）のセットアップ
     - Hardhat ノード起動 + コントラクトデプロイ
     - Jest ユニットテスト実行
     - Playwright E2E テスト実行
     - .env の復元・Hardhat ノード停止
3. 失敗したテストがあればエラー内容を分析し、修正案を提示する
4. すべて成功した場合は結果サマリーを表示する
