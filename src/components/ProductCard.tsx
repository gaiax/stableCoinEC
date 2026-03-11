import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Link href={`/products/${id}`} className="group">
      <Card className="flex flex-col h-full overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
        {imageUrl && (
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex flex-col flex-1 bg-[#F1F3F7]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium leading-snug">{title}</CardTitle>
            {shopName && <p className="text-xs text-muted-foreground">{shopName}</p>}
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <span className="text-sm font-bold text-foreground">
              {priceJPYC} JPYC
            </span>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
