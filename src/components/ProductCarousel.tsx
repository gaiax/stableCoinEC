'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ProductCard } from '@/components/ProductCard';

interface Product {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceJPYC: string;
  shopName: string;
  shopSlug: string;
}

interface ProductCarouselProps {
  products: Product[];
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);

  const getCards = () => {
    const container = scrollRef.current?.querySelector<HTMLElement>(':scope > div');
    if (!container) return [];
    return Array.from(container.children) as HTMLElement[];
  };

  const getStep = () => {
    const cards = getCards();
    if (cards.length < 2) return 240;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  };

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const step = getStep();
    const idx = Math.round(el.scrollLeft / step);
    setCurrentIndex(Math.max(0, Math.min(idx, products.length - 1)));
    const visible = Math.floor(el.clientWidth / step);
    setMaxIndex(Math.max(0, products.length - visible));
  }, [products.length]);

  useEffect(() => {
    updateIndex();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => updateIndex());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateIndex]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = getStep();
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(products.length - 1, currentIndex + 1);
    el.scrollTo({ left: newIndex * step, behavior: 'smooth' });
  };

  const handleScroll = () => {
    updateIndex();
  };

  return (
    <div className="relative">
      {/* 左ボタン */}
      {currentIndex > 0 && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-border/50 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          aria-label="前へ"
        >
          &lt;
        </button>
      )}

      {/* 右ボタン */}
      {currentIndex < maxIndex && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-border/50 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          aria-label="次へ"
        >
          &gt;
        </button>
      )}

      {/* カルーセル */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-x-auto pb-4 scrollbar-hide"
      >
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {products.map((product) => (
            <div key={product.id} className="w-48 md:w-56 flex-shrink-0">
              <ProductCard
                id={product.id}
                title={product.title}
                description={product.description}
                imageUrl={product.imageUrl}
                priceJPYC={product.priceJPYC}
                shopName={product.shopName}
                shopSlug={product.shopSlug}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ドットインジケーター */}
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {products.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
