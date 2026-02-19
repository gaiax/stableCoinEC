'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LegalSettingsFormProps {
  shopId: string;
  initialData: {
    legalBusinessName: string | null;
    legalAddress: string | null;
    legalPhone: string | null;
    legalEmail: string | null;
    legalBusinessHours: string | null;
    legalShippingInfo: string | null;
    legalReturnPolicy: string | null;
    legalPaymentMethod: string | null;
  };
}

export function LegalSettingsForm({ shopId, initialData }: LegalSettingsFormProps) {
  const [legalBusinessName, setLegalBusinessName] = useState(initialData.legalBusinessName ?? '');
  const [legalAddress, setLegalAddress] = useState(initialData.legalAddress ?? '');
  const [legalPhone, setLegalPhone] = useState(initialData.legalPhone ?? '');
  const [legalEmail, setLegalEmail] = useState(initialData.legalEmail ?? '');
  const [legalBusinessHours, setLegalBusinessHours] = useState(
    initialData.legalBusinessHours ?? ''
  );
  const [legalShippingInfo, setLegalShippingInfo] = useState(initialData.legalShippingInfo ?? '');
  const [legalReturnPolicy, setLegalReturnPolicy] = useState(initialData.legalReturnPolicy ?? '');
  const [legalPaymentMethod, setLegalPaymentMethod] = useState(
    initialData.legalPaymentMethod ?? ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const res = await fetch(`/api/shops/${shopId}/legal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalBusinessName: legalBusinessName.trim() || null,
          legalAddress: legalAddress.trim() || null,
          legalPhone: legalPhone.trim() || null,
          legalEmail: legalEmail.trim() || null,
          legalBusinessHours: legalBusinessHours.trim() || null,
          legalShippingInfo: legalShippingInfo.trim() || null,
          legalReturnPolicy: legalReturnPolicy.trim() || null,
          legalPaymentMethod: legalPaymentMethod.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '更新に失敗しました');
      }

      setMessage('特定商取引法に基づく表記を保存しました');
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
        <CardTitle>特定商取引法に基づく表記</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="legalBusinessName">事業者名（販売業者）</Label>
            <Input
              id="legalBusinessName"
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
              placeholder="例: 株式会社○○"
            />
          </div>

          <div>
            <Label htmlFor="legalAddress">所在地</Label>
            <Input
              id="legalAddress"
              value={legalAddress}
              onChange={(e) => setLegalAddress(e.target.value)}
              placeholder="例: 東京都渋谷区○○1-2-3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="legalPhone">電話番号</Label>
              <Input
                id="legalPhone"
                value={legalPhone}
                onChange={(e) => setLegalPhone(e.target.value)}
                placeholder="例: 03-1234-5678"
              />
            </div>

            <div>
              <Label htmlFor="legalEmail">メールアドレス</Label>
              <Input
                id="legalEmail"
                type="email"
                value={legalEmail}
                onChange={(e) => setLegalEmail(e.target.value)}
                placeholder="例: info@example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="legalBusinessHours">営業時間</Label>
            <Input
              id="legalBusinessHours"
              value={legalBusinessHours}
              onChange={(e) => setLegalBusinessHours(e.target.value)}
              placeholder="例: 平日10:00〜18:00（土日祝休み）"
            />
          </div>

          <div>
            <Label htmlFor="legalPaymentMethod">支払方法</Label>
            <Textarea
              id="legalPaymentMethod"
              value={legalPaymentMethod}
              onChange={(e) => setLegalPaymentMethod(e.target.value)}
              rows={2}
              placeholder="例: JPYC（暗号資産）による決済"
            />
          </div>

          <div>
            <Label htmlFor="legalShippingInfo">配送について</Label>
            <Textarea
              id="legalShippingInfo"
              value={legalShippingInfo}
              onChange={(e) => setLegalShippingInfo(e.target.value)}
              rows={3}
              placeholder="例: ご注文確認後、3営業日以内に発送いたします。配送業者はヤマト運輸を利用します。"
            />
          </div>

          <div>
            <Label htmlFor="legalReturnPolicy">返品・交換について</Label>
            <Textarea
              id="legalReturnPolicy"
              value={legalReturnPolicy}
              onChange={(e) => setLegalReturnPolicy(e.target.value)}
              rows={3}
              placeholder="例: 商品到着後7日以内にご連絡ください。お客様都合による返品の場合、送料はお客様負担となります。"
            />
          </div>

          {message && (
            <p className={`text-sm ${isError ? 'text-destructive' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? '保存中...' : '特定商取引法に基づく表記を保存する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
