import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCarousel } from '../ImageCarousel';

describe('ImageCarousel', () => {
  it('画像がない場合何も表示しない', () => {
    const { container } = render(<ImageCarousel images={[]} alt="テスト" />);
    expect(container.firstChild).toBeNull();
  });

  it('1枚の場合はシンプルな画像を表示（矢印なし）', () => {
    render(<ImageCarousel images={['/img1.jpg']} alt="テスト" />);

    const img = screen.getByAltText('テスト');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/img1.jpg');

    // 矢印ボタンは表示されない
    expect(screen.queryByLabelText('前の画像')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('次の画像')).not.toBeInTheDocument();
  });

  it('複数枚の場合はカルーセルを表示', () => {
    render(
      <ImageCarousel images={['/img1.jpg', '/img2.jpg', '/img3.jpg']} alt="テスト" />
    );

    // 最初の画像が表示される
    expect(screen.getByAltText('テスト - 1')).toHaveAttribute('src', '/img1.jpg');

    // 矢印ボタンが表示される
    expect(screen.getByLabelText('前の画像')).toBeInTheDocument();
    expect(screen.getByLabelText('次の画像')).toBeInTheDocument();

    // ドットインジケーターが3つ
    expect(screen.getByLabelText('画像 1')).toBeInTheDocument();
    expect(screen.getByLabelText('画像 2')).toBeInTheDocument();
    expect(screen.getByLabelText('画像 3')).toBeInTheDocument();
  });

  it('次へボタンで画像が切り替わる', () => {
    render(
      <ImageCarousel images={['/img1.jpg', '/img2.jpg']} alt="テスト" />
    );

    expect(screen.getByAltText('テスト - 1')).toHaveAttribute('src', '/img1.jpg');

    fireEvent.click(screen.getByLabelText('次の画像'));
    expect(screen.getByAltText('テスト - 2')).toHaveAttribute('src', '/img2.jpg');
  });

  it('前へボタンで最後の画像にループ', () => {
    render(
      <ImageCarousel images={['/img1.jpg', '/img2.jpg', '/img3.jpg']} alt="テスト" />
    );

    fireEvent.click(screen.getByLabelText('前の画像'));
    expect(screen.getByAltText('テスト - 3')).toHaveAttribute('src', '/img3.jpg');
  });

  it('ドットクリックで画像が切り替わる', () => {
    render(
      <ImageCarousel images={['/img1.jpg', '/img2.jpg', '/img3.jpg']} alt="テスト" />
    );

    fireEvent.click(screen.getByLabelText('画像 3'));
    expect(screen.getByAltText('テスト - 3')).toHaveAttribute('src', '/img3.jpg');
  });
});
