'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';

// JPYC ERC20 ABI (approve function)
const JPYC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Marketplace buy ABI
const MARKETPLACE_ABI = [
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_productId', type: 'uint256' }],
    outputs: [],
  },
] as const;

interface CheckoutButtonProps {
  productId: string;
  onChainProductId: bigint;
  priceJPYC: string;
}

type Step = 'idle' | 'approving' | 'approve-pending' | 'buying' | 'buy-pending' | 'success' | 'error';

export function CheckoutButton({ productId, onChainProductId, priceJPYC }: CheckoutButtonProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const jpycAddress = process.env.NEXT_PUBLIC_JPYC_ADDRESS as `0x${string}`;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  const priceWei = parseEther(priceJPYC);

  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeBuy } = useWriteContract();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { isSuccess: buySuccess } = useWaitForTransactionReceipt({
    hash: buyTxHash,
  });

  // Approve成功後にBuyを実行
  const handleApproveSuccess = async () => {
    setStep('buying');
    writeBuy(
      {
        address: contractAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'buy',
        args: [onChainProductId],
      },
      {
        onSuccess: async (hash) => {
          setBuyTxHash(hash);
          setStep('buy-pending');
        },
        onError: (err) => {
          setErrorMsg(err.message);
          setStep('error');
        },
      }
    );
  };

  // Buy成功後にOrderを記録
  const handleBuySuccess = async () => {
    if (!buyTxHash || !address) return;
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          buyerAddress: address,
          txHash: buyTxHash,
          amountPaid: priceJPYC,
        }),
      });
      setStep('success');
    } catch {
      setStep('success'); // APIエラーでも購入は成功
    }
  };

  // トランザクション完了を監視
  if (approveSuccess && step === 'approve-pending') {
    handleApproveSuccess();
  }

  if (buySuccess && step === 'buy-pending') {
    handleBuySuccess();
  }

  const handleCheckout = () => {
    if (!isConnected) {
      setErrorMsg('ウォレットを接続してください');
      return;
    }

    setStep('approving');
    setErrorMsg('');

    writeApprove(
      {
        address: jpycAddress,
        abi: JPYC_ABI,
        functionName: 'approve',
        args: [contractAddress, priceWei],
      },
      {
        onSuccess: (hash) => {
          setApproveTxHash(hash);
          setStep('approve-pending');
        },
        onError: (err) => {
          setErrorMsg(err.message);
          setStep('error');
        },
      }
    );
  };

  const stepMessages: Record<Step, string> = {
    idle: `購入する (${priceJPYC} JPYC)`,
    approving: 'MetaMaskで承認中...',
    'approve-pending': 'Approve確認中...',
    buying: 'MetaMaskで購入確認中...',
    'buy-pending': '購入確認中...',
    success: '購入完了!',
    error: 'もう一度試す',
  };

  if (!isConnected) {
    return (
      <Button disabled className="w-full">
        ウォレットを接続してください
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={step === 'error' ? () => setStep('idle') : handleCheckout}
        disabled={['approving', 'approve-pending', 'buying', 'buy-pending', 'success'].includes(step)}
        className="w-full"
        variant={step === 'success' ? 'secondary' : step === 'error' ? 'destructive' : 'default'}
      >
        {stepMessages[step]}
      </Button>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      {step === 'success' && (
        <p className="text-sm text-green-600">
          購入が完了しました。txHash: {buyTxHash?.slice(0, 10)}...
        </p>
      )}
    </div>
  );
}
