'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

export interface CheckoutButtonProps {
  productId: string;
  onChainProductId: bigint;
  priceJPYC: string;
  stock: number;
}

interface ShippingAddress {
  id: string;
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string | null;
  phone: string;
  isDefault: boolean;
}

type Step = 'idle' | 'approving' | 'approve-pending' | 'buying' | 'buy-pending' | 'success' | 'error';

export function CheckoutButton({ productId, onChainProductId, priceJPYC, stock }: CheckoutButtonProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  // 配送先住所
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '', postalCode: '', prefecture: '', city: '', address1: '', address2: '', phone: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);

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

  // ログイン済みなら配送先住所を取得
  const fetchAddresses = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingAddresses(true);
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
        // デフォルト住所があれば自動選択
        const defaultAddr = (data.addresses || []).find((a: ShippingAddress) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if ((data.addresses || []).length > 0) {
          setSelectedAddressId(data.addresses[0].id);
        }
      }
    } catch {
      // 無視
    } finally {
      setLoadingAddresses(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // 新しい住所を保存
  const handleSaveNewAddress = async () => {
    if (!newAddress.name || !newAddress.postalCode || !newAddress.prefecture ||
        !newAddress.city || !newAddress.address1 || !newAddress.phone) {
      setErrorMsg('配送先の必須項目をすべて入力してください');
      return;
    }
    setSavingAddress(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAddress, isDefault: addresses.length === 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses((prev) => [...prev, data.address]);
        setSelectedAddressId(data.address.id);
        setShowNewAddressForm(false);
        setNewAddress({ name: '', postalCode: '', prefecture: '', city: '', address1: '', address2: '', phone: '' });
      } else {
        const data = await res.json();
        setErrorMsg(data.error || '住所の保存に失敗しました');
      }
    } catch {
      setErrorMsg('住所の保存に失敗しました');
    } finally {
      setSavingAddress(false);
    }
  };

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
          buyerId: session?.user?.id ?? null,
          shippingAddressId: selectedAddressId || null,
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

    if (session?.user && !selectedAddressId) {
      setErrorMsg('配送先住所を選択してください');
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

  if (stock <= 0) {
    return (
      <Button disabled className="w-full" variant="secondary">
        売り切れ
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button disabled className="w-full">
        ウォレットを接続してください
      </Button>
    );
  }

  const isProcessing = ['approving', 'approve-pending', 'buying', 'buy-pending'].includes(step);

  return (
    <div className="space-y-4">
      {/* 配送先住所選択（ログイン済みの場合） */}
      {session?.user && sessionStatus === 'authenticated' && step !== 'success' && (
        <div className="border rounded-lg p-4 space-y-3">
          <Label className="font-semibold">配送先住所</Label>

          {loadingAddresses ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : addresses.length === 0 && !showNewAddressForm ? (
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">配送先住所が登録されていません。</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewAddressForm(true)}
              >
                新しい住所を追加
              </Button>
            </div>
          ) : (
            <>
              {/* 既存住所の選択 */}
              {addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block border rounded p-3 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id ? 'border-black bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingAddress"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mr-2"
                        disabled={isProcessing}
                      />
                      <span className="text-sm">
                        {addr.name} 〒{addr.postalCode} {addr.prefecture}{addr.city}{addr.address1}
                        {addr.address2 ? ` ${addr.address2}` : ''} TEL:{addr.phone}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* 新しい住所追加ボタン/フォーム */}
              {!showNewAddressForm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewAddressForm(true)}
                  disabled={isProcessing}
                >
                  別の住所を追加
                </Button>
              ) : (
                <div className="border rounded p-3 space-y-2 bg-gray-50">
                  <p className="text-sm font-medium">新しい配送先</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">宛名 *</Label>
                      <Input
                        value={newAddress.name}
                        onChange={(e) => setNewAddress((p) => ({ ...p, name: e.target.value }))}
                        placeholder="山田太郎"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">電話番号 *</Label>
                      <Input
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="090-1234-5678"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">郵便番号 *</Label>
                      <Input
                        value={newAddress.postalCode}
                        onChange={(e) => setNewAddress((p) => ({ ...p, postalCode: e.target.value }))}
                        placeholder="100-0001"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">都道府県 *</Label>
                      <Input
                        value={newAddress.prefecture}
                        onChange={(e) => setNewAddress((p) => ({ ...p, prefecture: e.target.value }))}
                        placeholder="東京都"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">市区町村 *</Label>
                    <Input
                      value={newAddress.city}
                      onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                      placeholder="千代田区"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">番地 *</Label>
                    <Input
                      value={newAddress.address1}
                      onChange={(e) => setNewAddress((p) => ({ ...p, address1: e.target.value }))}
                      placeholder="1-1-1"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">建物名・部屋番号</Label>
                    <Input
                      value={newAddress.address2}
                      onChange={(e) => setNewAddress((p) => ({ ...p, address2: e.target.value }))}
                      placeholder="マンション101"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveNewAddress}
                      disabled={savingAddress}
                    >
                      {savingAddress ? '保存中...' : '保存して選択'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewAddressForm(false)}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground">
            <Link href="/mypage/addresses" className="text-blue-600 hover:underline">
              住所の管理はこちら
            </Link>
          </p>
        </div>
      )}

      {/* 未ログインの場合のメッセージ */}
      {!session?.user && sessionStatus !== 'loading' && (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            <Link href="/login" className="text-blue-600 hover:underline">ログイン</Link>
            すると、配送先住所を設定して購入できます。
          </p>
        </div>
      )}

      {/* 購入ボタン */}
      <Button
        onClick={step === 'error' ? () => setStep('idle') : handleCheckout}
        disabled={isProcessing || step === 'success'}
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
