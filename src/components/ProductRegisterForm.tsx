'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SplitInput {
  recipientAddress: string;
  amount: string;     // 金額 (JPYC) — 主入力
}

interface ProductRegisterFormProps {
  shopId: string;
  apiKey: string;
  shopWalletAddress?: string | null;
  onSuccess?: () => void;
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'アップロードに失敗しました');
  }
  const data = await res.json();
  return data.imageUrl;
}

/**
 * 金額からbasis pointsを計算する。
 * 最後の受取人に端数を寄せて合計10000を保証する。
 */
function amountsToBasisPoints(amounts: number[], totalPrice: number): number[] {
  if (amounts.length === 0 || totalPrice <= 0) return [];

  const basisPoints: number[] = [];
  let usedBp = 0;

  for (let i = 0; i < amounts.length; i++) {
    if (i === amounts.length - 1) {
      // 最後の受取人に残りを割り当て
      basisPoints.push(10000 - usedBp);
    } else {
      const bp = Math.floor((amounts[i] / totalPrice) * 10000);
      basisPoints.push(bp);
      usedBp += bp;
    }
  }

  return basisPoints;
}

export function ProductRegisterForm({ shopId, apiKey, shopWalletAddress, onSuccess }: ProductRegisterFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [priceJPYC, setPriceJPYC] = useState('');
  const [stock, setStock] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([
    { recipientAddress: shopWalletAddress ?? '', amount: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const additionalImageRef = useRef<HTMLInputElement>(null);

  const price = parseFloat(priceJPYC) || 0;
  const totalAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const isAmountValid = price > 0 && Math.abs(totalAmount - price) < 0.01;

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImage(file);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const removeMainImage = () => {
    setMainImage(null);
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImagePreview(null);
    if (mainImageRef.current) mainImageRef.current.value = '';
  };

  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (additionalImages.length >= 4) {
      setError('追加画像は最大4枚までです');
      return;
    }
    setAdditionalImages((prev) => [...prev, file]);
    setAdditionalPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    if (additionalImageRef.current) additionalImageRef.current.value = '';
  };

  const removeAdditionalImage = (index: number) => {
    URL.revokeObjectURL(additionalPreviews[index]);
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addSplit = () => {
    setSplits([...splits, { recipientAddress: '', amount: '' }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplitAddress = (index: number, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], recipientAddress: value };
    setSplits(newSplits);
  };

  const updateSplitAmount = (index: number, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], amount: value };
    setSplits(newSplits);
  };

  // 受取人が1人のとき、価格変更で自動的に金額をセット
  const handlePriceChange = (newPrice: string) => {
    setPriceJPYC(newPrice);
    if (splits.length === 1) {
      setSplits([{ ...splits[0], amount: newPrice }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAmountValid) {
      setError(`分配金額の合計が価格と一致しません（合計: ${totalAmount} / 価格: ${price}）`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. メイン画像アップロード
      let imageUrl: string | null = null;
      if (mainImage) {
        imageUrl = await uploadFile(mainImage);
      }

      // 2. 追加画像アップロード
      const additionalImageUrls: string[] = [];
      for (const file of additionalImages) {
        const url = await uploadFile(file);
        additionalImageUrls.push(url);
      }

      // 3. 金額ベースで分配情報を送信
      const apiSplits = splits.map(s => ({
        recipientAddress: s.recipientAddress,
        amount: s.amount,
      }));

      // 4. 商品登録
      const res = await fetch('/api/products/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          shopId,
          title,
          description,
          imageUrl,
          additionalImageUrls,
          priceJPYC,
          stock: stock ? parseInt(stock) : 0,
          splits: apiSplits,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '登録に失敗しました');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-green-600 font-medium">商品が正常に登録されました!</p>
        </CardContent>
      </Card>
    );
  }

  // basis points のプレビュー計算
  const amounts = splits.map(s => parseFloat(s.amount) || 0);
  const bpPreview = price > 0 && isAmountValid ? amountsToBasisPoints(amounts, price) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品登録</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">商品名 *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="商品の詳細説明を入力してください"
            />
          </div>

          {/* メイン画像 */}
          <div>
            <Label>メイン画像</Label>
            {mainImagePreview ? (
              <div className="mt-2 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImagePreview}
                  alt="メイン画像プレビュー"
                  className="w-40 h-40 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={removeMainImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  x
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <input
                  ref={mainImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleMainImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            )}
          </div>

          {/* 追加画像 */}
          <div>
            <Label>追加画像 (最大4枚)</Label>
            <div className="flex gap-3 mt-2 flex-wrap">
              {additionalPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`追加画像 ${index + 1}`}
                    className="w-24 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    x
                  </button>
                </div>
              ))}
              {additionalImages.length < 4 && (
                <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <span className="text-2xl text-muted-foreground">+</span>
                  <input
                    ref={additionalImageRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAdditionalImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="priceJPYC">価格 (JPYC) *</Label>
            <Input id="priceJPYC" type="number" value={priceJPYC} onChange={(e) => handlePriceChange(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="stock">在庫数</Label>
            <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>

          <div>
            <Label>売上分配設定</Label>

            {price > 0 && (
              <>
                {isAmountValid ? (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-1">
                    <span>&#10003;</span> 合計 {totalAmount} JPYC = 価格と一致
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    分配金額の合計が価格と一致しません（合計: {totalAmount} JPYC / 価格: {price} JPYC）
                  </div>
                )}
              </>
            )}

            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 mt-2 items-end">
                <div className="flex-1">
                  {index === 0 && <span className="text-xs text-muted-foreground">受取アドレス</span>}
                  <Input
                    placeholder="受取アドレス (0x...)"
                    value={split.recipientAddress}
                    onChange={(e) => updateSplitAddress(index, e.target.value)}
                  />
                </div>
                <div className="w-32">
                  {index === 0 && <span className="text-xs text-muted-foreground">金額 (JPYC)</span>}
                  <Input
                    type="number"
                    min="0"
                    placeholder="金額"
                    value={split.amount}
                    onChange={(e) => updateSplitAmount(index, e.target.value)}
                  />
                </div>
                <div className="w-20 text-right">
                  {index === 0 && <span className="text-xs text-muted-foreground block">割合</span>}
                  <span className="text-sm text-muted-foreground leading-10">
                    {bpPreview ? `${(bpPreview[index] / 100).toFixed(2)}%` : '—'}
                  </span>
                </div>
                {splits.length > 1 && (
                  <Button type="button" variant="destructive" onClick={() => removeSplit(index)}>
                    削除
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addSplit} className="mt-2">
              + 受取人を追加
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isLoading || !isAmountValid} className="w-full">
            {isLoading ? '登録中...' : '商品を登録する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
