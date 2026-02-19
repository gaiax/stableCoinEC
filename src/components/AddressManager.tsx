'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Address {
  id: string;
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string | null;
  phone: string;
  isDefault: boolean;
  createdAt: string;
}

interface AddressFormData {
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = {
  name: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address1: '',
  address2: '',
  phone: '',
  isDefault: false,
};

export function AddressManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const startEdit = (address: Address) => {
    setForm({
      name: address.name,
      postalCode: address.postalCode,
      prefecture: address.prefecture,
      city: address.city,
      address1: address.address1,
      address2: address.address2 || '',
      phone: address.phone,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      resetForm();
      router.refresh();
      // ページを再取得して最新の状態を反映
      const addressesRes = await fetch('/api/addresses');
      if (addressesRes.ok) {
        const data = await addressesRes.json();
        setAddresses(data.addresses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この住所を削除してもよろしいですか？')) return;

    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      setAddresses(addresses.filter((a) => a.id !== id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const updateField = (field: keyof AddressFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* 住所一覧 */}
      {addresses.length === 0 && !showForm && (
        <p className="text-muted-foreground">配送先住所が登録されていません。</p>
      )}

      {addresses.map((address) => (
        <Card key={address.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{address.name}</p>
                  {address.isDefault && (
                    <Badge variant="secondary" className="text-xs">デフォルト</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  〒{address.postalCode}
                </p>
                <p className="text-sm">
                  {address.prefecture}{address.city}{address.address1}
                </p>
                {address.address2 && (
                  <p className="text-sm">{address.address2}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  TEL: {address.phone}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(address)}
                >
                  編集
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                >
                  削除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 追加/編集フォーム */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? '住所を編集' : '新しい住所を追加'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">宛名 *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">郵便番号 *</Label>
                  <Input
                    id="postalCode"
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="123-4567"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prefecture">都道府県 *</Label>
                  <Input
                    id="prefecture"
                    value={form.prefecture}
                    onChange={(e) => updateField('prefecture', e.target.value)}
                    placeholder="東京都"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="city">市区町村 *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="渋谷区"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address1">住所1 *</Label>
                <Input
                  id="address1"
                  value={form.address1}
                  onChange={(e) => updateField('address1', e.target.value)}
                  placeholder="1-2-3"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address2">住所2（建物名など）</Label>
                <Input
                  id="address2"
                  value={form.address2}
                  onChange={(e) => updateField('address2', e.target.value)}
                  placeholder="マンション名 101号室"
                />
              </div>
              <div>
                <Label htmlFor="phone">電話番号 *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="090-1234-5678"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => updateField('isDefault', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  デフォルトの配送先にする
                </Label>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? '保存中...' : '保存する'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="w-full">
          + 新しい住所を追加
        </Button>
      )}
    </div>
  );
}
