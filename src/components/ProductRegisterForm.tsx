'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SplitInput {
  recipientAddress: string;
  percentage: number; // basis points (10000 = 100%)
}

interface ProductRegisterFormProps {
  shopId: string;
  apiKey: string;
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

export function ProductRegisterForm({ shopId, apiKey, onSuccess }: ProductRegisterFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [priceJPYC, setPriceJPYC] = useState('');
  const [stock, setStock] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([
    { recipientAddress: '', percentage: 10000 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const additionalImageRef = useRef<HTMLInputElement>(null);

  const totalBasisPoints = splits.reduce((sum, s) => sum + s.percentage, 0);

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
    setSplits([...splits, { recipientAddress: '', percentage: 0 }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof SplitInput, value: string | number) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalBasisPoints !== 10000) {
      setError('分配比率の合計は10000 basis points (100%) にしてください');
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

      // 3. 商品登録
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
          splits,
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
            <Input id="priceJPYC" type="number" value={priceJPYC} onChange={(e) => setPriceJPYC(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="stock">在庫数</Label>
            <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>

          <div>
            <Label>売上分配設定 (合計: {totalBasisPoints}/10000 bp)</Label>
            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  placeholder="受取アドレス (0x...)"
                  value={split.recipientAddress}
                  onChange={(e) => updateSplit(index, 'recipientAddress', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="bp (例: 5000=50%)"
                  value={split.percentage}
                  onChange={(e) => updateSplit(index, 'percentage', parseInt(e.target.value) || 0)}
                  className="w-40"
                />
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

          <Button type="submit" disabled={isLoading || totalBasisPoints !== 10000} className="w-full">
            {isLoading ? '登録中...' : '商品を登録する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
