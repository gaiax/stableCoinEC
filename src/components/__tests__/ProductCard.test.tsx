/**
 * ProductCard コンポーネントテスト
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const mockPush = jest.fn();

// モック: next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

  beforeEach(() => {
    mockPush.mockClear();
  });

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

  it('カードクリックで商品詳細に遷移する', () => {
    render(<ProductCard {...defaultProps} />);
    fireEvent.click(screen.getByText('テスト商品'));
    expect(mockPush).toHaveBeenCalledWith('/products/product-1');
  });

  it('shopSlugがある場合にショップへのリンクが表示される', () => {
    render(<ProductCard {...defaultProps} shopName="テストショップ" shopSlug="test-shop" />);
    const shopLink = screen.getByRole('link', { name: 'テストショップ' });
    expect(shopLink).toHaveAttribute('href', '/shops/test-shop');
  });

  it('shopSlugがない場合はショップリンクではなくテキスト表示', () => {
    render(<ProductCard {...defaultProps} shopName="テストショップ" />);
    expect(screen.getByText('テストショップ')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'テストショップ' })).not.toBeInTheDocument();
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
