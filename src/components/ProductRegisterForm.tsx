'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SplitInput {
  recipientAddress: string;
  percentage: number; // パーセント (0-100) — UI用
  amount: string;     // 金額表示 — UI用
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
    { recipientAddress: shopWalletAddress ?? '', percentage: 100, amount: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const additionalImageRef = useRef<HTMLInputElement>(null);

  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

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

  const price = parseFloat(priceJPYC) || 0;

  const recalcAmount = (pct: number) => {
    if (price <= 0) return '';
    return Math.round(price * pct / 100).toString();
  };

  const addSplit = () => {
    setSplits([...splits, { recipientAddress: '', percentage: 0, amount: '' }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplitAddress = (index: number, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], recipientAddress: value };
    setSplits(newSplits);
  };

  const updateSplitPercentage = (index: number, value: number) => {
    const newSplits = [...splits];
    newSplits[index] = {
      ...newSplits[index],
      percentage: value,
      amount: recalcAmount(value),
    };
    setSplits(newSplits);
  };

  const updateSplitAmount = (index: number, value: string) => {
    const newSplits = [...splits];
    const amt = parseFloat(value) || 0;
    const pct = price > 0 ? parseFloat((amt / price * 100).toFixed(2)) : 0;
    newSplits[index] = {
      ...newSplits[index],
      percentage: pct,
      amount: value,
    };
    setSplits(newSplits);
  };

  const handlePriceChange = (newPrice: string) => {
    setPriceJPYC(newPrice);
    const p = parseFloat(newPrice) || 0;
    if (p > 0) {
      setSplits(splits.map(s => ({
        ...s,
        amount: Math.round(p * s.percentage / 100).toString(),
      })));
    } else {
      setSplits(splits.map(s => ({ ...s, amount: '' })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError('分配比率の合計が100%になっていません');
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

      // 3. % → basis points に変換してAPI送信
      const apiSplits = splits.map(s => ({
        recipientAddress: s.recipientAddress,
        percentage: Math.round(s.percentage * 100),
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
            <Label>売上分配設定 (合計: {totalPercentage}%)</Label>

            {Math.abs(totalPercentage - 100) > 0.01 ? (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                分配比率の合計が100%になっていません（現在: {totalPercentage}%）
              </div>
            ) : (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-1">
                <span>&#10003;</span> 合計 100%
              </div>
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
                <div className="w-28">
                  {index === 0 && <span className="text-xs text-muted-foreground">割合 (%)</span>}
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="% (例: 50)"
                    value={split.percentage}
                    onChange={(e) => updateSplitPercentage(index, parseFloat(e.target.value) || 0)}
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
                    disabled={price <= 0}
                  />
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

          <Button type="submit" disabled={isLoading || Math.abs(totalPercentage - 100) > 0.01} className="w-full">
            {isLoading ? '登録中...' : '商品を登録する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
