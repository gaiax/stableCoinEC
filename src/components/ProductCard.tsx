'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductCardProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceJPYC: string;
  shopName?: string;
  shopSlug?: string;
}

export function ProductCard({ id, title, description, imageUrl, priceJPYC, shopName, shopSlug }: ProductCardProps) {
  const router = useRouter();

  return (
    <div
      className="group cursor-pointer"
      onClick={() => router.push(`/products/${id}`)}
    >
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
            {shopName && (
              shopSlug ? (
                <Link
                  href={`/shops/${shopSlug}`}
                  className="text-xs text-muted-foreground hover:text-secondary hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shopName}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">{shopName}</p>
              )
            )}
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
    </div>
  );
}
