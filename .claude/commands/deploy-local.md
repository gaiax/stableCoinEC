Hardhat Nodeへのローカルデプロイを実行してください。

手順:
1. `cd contracts && npx hardhat node` でローカルノードが起動済みか確認（起動していなければユーザーに伝える）
2. `cd contracts && npx hardhat run scripts/deploy-local.ts --network localhost` を実行
3. 出力されたコントラクトアドレス・JPYCアドレスを `.env.local` に反映するよう案内する
4. `NEXT_PUBLIC_CHAIN=localhost` が設定されているか確認する
