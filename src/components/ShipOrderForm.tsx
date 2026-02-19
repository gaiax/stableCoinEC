'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShipOrderFormProps {
  orderId: string;
}

export function ShipOrderForm({ orderId }: ShipOrderFormProps) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '発送処理に失敗しました');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '発送処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="trackingNumber">追跡番号（任意）</Label>
        <Input
          id="trackingNumber"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="例: 1234-5678-9012"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? '処理中...' : '発送済みにする'}
      </Button>
    </form>
  );
}
