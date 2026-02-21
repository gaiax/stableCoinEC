'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useReadContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';

const jpycAddress = (process.env.NEXT_PUBLIC_JPYC_ADDRESS || '') as `0x${string}`;

function formatJpycBalance(raw: bigint | undefined): string {
  if (raw === undefined) return '...';
  const num = Math.floor(Number(formatUnits(raw, 18)));
  return num.toLocaleString('ja-JP');
}

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none' as const, userSelect: 'none' as const },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    ウォレット接続
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium"
                  >
                    ネットワーク切替
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-1">
                  <JpycBalance address={account.address as `0x${string}`} />
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

function JpycBalance({ address }: { address: `0x${string}` }) {
  const { data: balance } = useReadContract({
    address: jpycAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && !!jpycAddress },
  });

  return (
    <span className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
      {formatJpycBalance(balance)} JPYC
    </span>
  );
}
