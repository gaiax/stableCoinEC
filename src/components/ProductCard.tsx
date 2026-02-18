import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceJPYC: string;
  shopName?: string;
}

export function ProductCard({ id, title, description, imageUrl, priceJPYC, shopName }: ProductCardProps) {
  return (
    <Card className="flex flex-col h-full">
      {imageUrl && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {shopName && <p className="text-sm text-muted-foreground">{shopName}</p>}
      </CardHeader>
      <CardContent className="flex-1">
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge variant="secondary" className="text-base font-bold">
          {priceJPYC} JPYC
        </Badge>
        <Button asChild>
          <Link href={`/products/${id}`}>詳細を見る</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
