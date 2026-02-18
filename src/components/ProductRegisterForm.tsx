'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function ProductRegisterForm({ shopId, apiKey, onSuccess }: ProductRegisterFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceJPYC, setPriceJPYC] = useState('');
  const [splits, setSplits] = useState<SplitInput[]>([
    { recipientAddress: '', percentage: 10000 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const totalBasisPoints = splits.reduce((sum, s) => sum + s.percentage, 0);

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
      const res = await fetch('/api/products/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ shopId, title, description, imageUrl, priceJPYC, splits }),
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
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="imageUrl">画像URL</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="priceJPYC">価格 (JPYC) *</Label>
            <Input id="priceJPYC" type="number" value={priceJPYC} onChange={(e) => setPriceJPYC(e.target.value)} required />
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
