'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ShopSettingsFormProps {
  shopId: string;
  initialData: {
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    walletAddress: string | null;
    shippingFee: string | null;
    freeShippingThreshold: string | null;
  };
}

export function ShopSettingsForm({ shopId, initialData }: ShopSettingsFormProps) {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData.coverImageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(initialData.walletAddress ?? '');
  const [shippingFee, setShippingFee] = useState(initialData.shippingFee ?? '');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    initialData.freeShippingThreshold ?? ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'アップロードに失敗しました');
      setCoverImageUrl(data.imageUrl);
      setMessage('カバー画像をアップロードしました。「設定を保存する」を押して反映してください');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const res = await fetch(`/api/shops/${shopId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl: coverImageUrl || null,
          walletAddress: walletAddress.trim() || null,
          shippingFee: shippingFee || null,
          freeShippingThreshold: freeShippingThreshold || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新に失敗しました');
      }

      setMessage('設定を保存しました');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新に失敗しました');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ショップ基本設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="shopName">ショップ名 *</Label>
            <Input
              id="shopName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="shopDescription">ショップ説明</Label>
            <Textarea
              id="shopDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="ショップの説明を入力してください"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">カバー画像</h3>
            {coverImageUrl && (
              <div className="mb-3">
                <img
                  src={coverImageUrl}
                  alt="カバー画像プレビュー"
                  className="w-full h-40 object-cover rounded-md"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Input
                id="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverUpload}
                disabled={isUploading}
                className="flex-1"
              />
              {coverImageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCoverImageUrl('')}
                >
                  削除
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isUploading ? 'アップロード中...' : 'JPEG、PNG、WebP形式（5MB以下）。ショップページの上部に表示されます'}
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Walletアドレス</h3>
            <div>
              <Label htmlFor="walletAddress">Walletアドレス</Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                売上の受取先アドレスです。商品登録時のデフォルト分配先になります
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">送料設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shippingFee">送料 (JPYC)</Label>
                <Input
                  id="shippingFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="空欄の場合は送料無料"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  空欄にすると送料無料になります
                </p>
              </div>

              <div>
                <Label htmlFor="freeShippingThreshold">送料無料金額 (JPYC)</Label>
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  placeholder="例: 5000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  この金額以上の注文で送料無料になります
                </p>
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${isError ? 'text-destructive' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading ? '保存中...' : '設定を保存する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
