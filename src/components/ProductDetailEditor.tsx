'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Split {
  id: string;
  recipientAddress: string;
  percentage: number;
}

interface ProductImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceJPYC: string;
  stock: number;
  isPublished: boolean;
  onChainProductId: string | null;
  txHash: string | null;
  splits: Split[];
  images: ProductImage[];
  _summary: {
    orderCount: number;
    activeOrderCount: number;
    totalRevenue: number;
  };
}

interface Props {
  product: ProductData;
}

type EditableField = 'title' | 'description' | 'priceJPYC' | 'stock';

const fieldLabels: Record<EditableField, string> = {
  title: '商品名',
  description: '説明',
  priceJPYC: '価格 (JPYC)',
  stock: '在庫数',
};

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

export default function ProductDetailEditor({ product: initialProduct }: Props) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductData>(initialProduct);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画像アップロード関連
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const additionalImageRef = useRef<HTMLInputElement>(null);

  const startEdit = (field: EditableField) => {
    const currentValue = product[field];
    setEditValue(currentValue?.toString() ?? '');
    setEditingField(field);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setError(null);
  };

  const saveField = async () => {
    if (!editingField) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editingField]: editValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '更新に失敗しました');
        return;
      }

      setProduct((prev) => ({
        ...prev,
        ...data.product,
        images: prev.images,
        _summary: prev._summary,
      }));
      setEditingField(null);
      setEditValue('');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setToggling(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !product.isPublished }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '更新に失敗しました');
        return;
      }

      setProduct((prev) => ({
        ...prev,
        ...data.product,
        images: prev.images,
        _summary: prev._summary,
      }));
      router.refresh();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setToggling(false);
    }
  };

  // メイン画像アップロード
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMainImage(true);
    setError(null);

    try {
      const imageUrl = await uploadFile(file);

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '更新に失敗しました');
        return;
      }

      setProduct((prev) => ({
        ...prev,
        ...data.product,
        images: prev.images,
        _summary: prev._summary,
      }));
    } catch {
      setError('画像のアップロードに失敗しました');
    } finally {
      setUploadingMainImage(false);
      if (mainImageRef.current) mainImageRef.current.value = '';
    }
  };

  // 追加画像アップロード
  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (product.images.length >= 4) {
      setError('追加画像は最大4枚までです');
      return;
    }
    setUploadingAdditional(true);
    setError(null);

    try {
      const imageUrl = await uploadFile(file);

      const res = await fetch(`/api/products/${product.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '追加に失敗しました');
        return;
      }

      setProduct((prev) => ({
        ...prev,
        images: [...prev.images, data.image],
      }));
    } catch {
      setError('画像のアップロードに失敗しました');
    } finally {
      setUploadingAdditional(false);
      if (additionalImageRef.current) additionalImageRef.current.value = '';
    }
  };

  // 追加画像削除
  const handleDeleteImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    setError(null);

    try {
      const res = await fetch(`/api/products/${product.id}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '削除に失敗しました');
        return;
      }

      setProduct((prev) => ({
        ...prev,
        images: prev.images.filter((img) => img.id !== imageId),
      }));
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setDeletingImageId(null);
    }
  };

  const renderField = (field: EditableField) => {
    const isEditing = editingField === field;
    const value = product[field];
    const displayValue = value?.toString() || '(未設定)';

    if (isEditing) {
      const isTextarea = field === 'description';
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {fieldLabels[field]}
          </label>
          {isTextarea ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={8}
            />
          ) : (
            <Input
              type={field === 'priceJPYC' || field === 'stock' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              min={field === 'stock' ? '0' : field === 'priceJPYC' ? '0.01' : undefined}
              step={field === 'priceJPYC' ? '0.01' : undefined}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={saveField} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
              キャンセル
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{fieldLabels[field]}</p>
          {field === 'description' ? (
            <p className="whitespace-pre-wrap">{displayValue}</p>
          ) : field === 'priceJPYC' ? (
            <p className="text-lg font-semibold">{Number(value).toLocaleString()} JPYC</p>
          ) : field === 'stock' ? (
            <p>
              {value} 個
              {product.stock === 0 && (
                <Badge variant="destructive" className="ml-2">SOLD OUT</Badge>
              )}
            </p>
          ) : (
            <p>{displayValue}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startEdit(field)}
          disabled={editingField !== null}
        >
          ✏
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ヘッダー: 商品名 + 販売ステータス */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <Badge className={product.isPublished ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}>
            {product.isPublished ? '販売中' : '販売停止'}
          </Badge>
        </div>
        <Button
          variant={product.isPublished ? 'destructive' : 'default'}
          onClick={togglePublish}
          disabled={toggling}
          className={!product.isPublished ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
        >
          {toggling
            ? '処理中...'
            : product.isPublished
              ? '販売停止'
              : '販売再開'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左: 商品情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* メイン画像 */}
          <Card>
            <CardHeader>
              <CardTitle>メイン画像</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {product.imageUrl ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-48 h-48 object-cover rounded border"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded border flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">画像なし</span>
                  </div>
                )}
                <div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
                      {uploadingMainImage ? 'アップロード中...' : '画像を変更'}
                    </span>
                    <input
                      ref={mainImageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleMainImageUpload}
                      disabled={uploadingMainImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 追加画像 */}
          <Card>
            <CardHeader>
              <CardTitle>追加画像 (最大4枚)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {product.images.map((img) => (
                  <div key={img.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.imageUrl}
                      alt=""
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50"
                    >
                      x
                    </button>
                  </div>
                ))}
                {product.images.length < 4 && (
                  <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <span className="text-2xl text-muted-foreground">
                      {uploadingAdditional ? '...' : '+'}
                    </span>
                    <input
                      ref={additionalImageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAdditionalImageUpload}
                      disabled={uploadingAdditional}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 商品情報フィールド */}
          <Card>
            <CardHeader>
              <CardTitle>商品情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField('title')}
              <hr />
              {renderField('description')}
              <hr />
              {renderField('priceJPYC')}
              <hr />
              {renderField('stock')}
            </CardContent>
          </Card>

          {/* 分配設定 */}
          <Card>
            <CardHeader>
              <CardTitle>売上分配設定</CardTitle>
            </CardHeader>
            <CardContent>
              {product.splits.length === 0 ? (
                <p className="text-muted-foreground text-sm">分配設定なし</p>
              ) : (
                <div className="space-y-2">
                  {product.splits.map((split) => (
                    <div key={split.id} className="flex justify-between text-sm">
                      <span className="font-mono text-muted-foreground">
                        {split.recipientAddress.slice(0, 6)}...{split.recipientAddress.slice(-4)}
                      </span>
                      <span>
                        {Math.round(split.percentage / 10000 * Number(product.priceJPYC)).toLocaleString()} JPYC
                        <span className="text-muted-foreground ml-1">
                          ({(split.percentage / 100).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右: サマリー + メタデータ */}
        <div className="space-y-6">
          {/* 売上サマリー */}
          <Card>
            <CardHeader>
              <CardTitle>売上サマリー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">総注文数</span>
                <span className="font-medium">{product._summary.orderCount} 件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">有効注文数</span>
                <span className="font-medium">{product._summary.activeOrderCount} 件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">総売上</span>
                <span className="font-medium">{product._summary.totalRevenue.toLocaleString()} JPYC</span>
              </div>
            </CardContent>
          </Card>

          {/* オンチェーン情報 */}
          <Card>
            <CardHeader>
              <CardTitle>オンチェーン情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">オンチェーンID</p>
                <p className="font-mono text-sm">{product.onChainProductId ?? '(未登録)'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TxHash</p>
                {product.txHash ? (
                  <p className="font-mono text-xs break-all">{product.txHash}</p>
                ) : (
                  <p className="text-sm">(なし)</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
