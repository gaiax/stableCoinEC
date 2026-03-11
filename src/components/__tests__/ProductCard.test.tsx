/**
 * ProductCard コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

// モック: next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('ProductCard', () => {
  const defaultProps = {
    id: 'product-1',
    title: 'テスト商品',
    priceJPYC: '1000',
  };

  it('商品名と価格が表示される', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.getByText('テスト商品')).toBeInTheDocument();
    expect(screen.getByText('1000 JPYC')).toBeInTheDocument();
  });

  it('説明がある場合に表示される', () => {
    render(<ProductCard {...defaultProps} description="テスト説明文" />);
    expect(screen.getByText('テスト説明文')).toBeInTheDocument();
  });

  it('説明がnullの場合は表示されない', () => {
    render(<ProductCard {...defaultProps} description={null} />);
    expect(screen.queryByText('テスト説明文')).not.toBeInTheDocument();
  });

  it('shopNameが表示される', () => {
    render(<ProductCard {...defaultProps} shopName="テストショップ" />);
    expect(screen.getByText('テストショップ')).toBeInTheDocument();
  });

  it('詳細リンクのhrefが正しい', () => {
    render(<ProductCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/product-1');
  });

  it('画像URLがある場合にimgが表示される', () => {
    render(<ProductCard {...defaultProps} imageUrl="https://example.com/img.png" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
    expect(img).toHaveAttribute('alt', 'テスト商品');
  });

  it('画像URLがない場合にimgが表示されない', () => {
    render(<ProductCard {...defaultProps} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
