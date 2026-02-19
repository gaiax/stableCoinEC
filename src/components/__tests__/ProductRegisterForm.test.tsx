/**
 * ProductRegisterForm コンポーネントテスト
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductRegisterForm } from '../ProductRegisterForm';

// fetch モック
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ProductRegisterForm', () => {
  const defaultProps = {
    shopId: 'shop-1',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('フォームが初期表示される', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    expect(screen.getByText('商品登録')).toBeInTheDocument();
    expect(screen.getByLabelText('商品名 *')).toBeInTheDocument();
    expect(screen.getByLabelText('価格 (JPYC) *')).toBeInTheDocument();
    expect(screen.getByText('商品を登録する')).toBeInTheDocument();
  });

  it('分配設定を追加できる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    const addButton = screen.getByText('+ 受取人を追加');
    fireEvent.click(addButton);

    // 初期1つ + 追加1つ = 2つのアドレス入力
    const addressInputs = screen.getAllByPlaceholderText('受取アドレス (0x...)');
    expect(addressInputs).toHaveLength(2);
  });

  it('分配設定を削除できる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    // まず追加
    fireEvent.click(screen.getByText('+ 受取人を追加'));
    expect(screen.getAllByPlaceholderText('受取アドレス (0x...)')).toHaveLength(2);

    // 削除ボタンが表示される (2つ以上の場合のみ)
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getAllByPlaceholderText('受取アドレス (0x...)')).toHaveLength(1);
  });

  it('分配合計が10000でない場合に送信ボタンが無効になる', () => {
    render(<ProductRegisterForm {...defaultProps} />);

    // 分配設定のpercentageを5000に変更（10000ではない）
    const bpInput = screen.getByPlaceholderText('bp (例: 5000=50%)');
    fireEvent.change(bpInput, { target: { value: '5000' } });

    // ボタンが disabled になることを確認
    const submitButton = screen.getByText('商品を登録する');
    expect(submitButton).toBeDisabled();

    // 合計ラベルに5000が表示される
    expect(screen.getByText(/5000\/10000 bp/)).toBeInTheDocument();
  });

  it('送信成功時に完了メッセージが表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProductRegisterForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: 'テスト商品' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // percentage はデフォルト10000のまま
    fireEvent.click(screen.getByText('商品を登録する'));

    await waitFor(() => {
      expect(screen.getByText('商品が正常に登録されました!')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/products/register', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'x-api-key': 'test-api-key',
      }),
    }));
  });

  it('送信失敗時にエラーメッセージが表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'サーバーエラー' }),
    });

    render(<ProductRegisterForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: 'テスト' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '500' } });
    fireEvent.click(screen.getByText('商品を登録する'));

    await waitFor(() => {
      expect(screen.getByText('サーバーエラー')).toBeInTheDocument();
    });
  });

  it('onSuccessコールバックが呼ばれる', async () => {
    const onSuccess = jest.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProductRegisterForm {...defaultProps} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: 'テスト' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '500' } });
    fireEvent.click(screen.getByText('商品を登録する'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
