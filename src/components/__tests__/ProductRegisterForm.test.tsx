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
    shopWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
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

  it('ショップWalletアドレスが初期値として入力される', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    const addressInput = screen.getByPlaceholderText('受取アドレス (0x...)');
    expect(addressInput).toHaveValue('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('shopWalletAddressがnullの場合は空になる', () => {
    render(<ProductRegisterForm {...defaultProps} shopWalletAddress={null} />);
    const addressInput = screen.getByPlaceholderText('受取アドレス (0x...)');
    expect(addressInput).toHaveValue('');
  });

  it('受取人が1人のとき、価格入力で金額が自動セットされる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    const amountInput = screen.getByPlaceholderText('金額');
    expect(amountInput).toHaveValue(1000);
  });

  it('分配設定を追加できる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    const addButton = screen.getByText('+ 受取人を追加');
    fireEvent.click(addButton);

    const addressInputs = screen.getAllByPlaceholderText('受取アドレス (0x...)');
    expect(addressInputs).toHaveLength(2);
  });

  it('分配設定を削除できる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    fireEvent.click(screen.getByText('+ 受取人を追加'));
    expect(screen.getAllByPlaceholderText('受取アドレス (0x...)')).toHaveLength(2);

    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getAllByPlaceholderText('受取アドレス (0x...)')).toHaveLength(1);
  });

  it('金額合計が価格と一致しない場合に警告が表示される', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // 金額を500に変更（価格と不一致）
    const amountInput = screen.getByPlaceholderText('金額');
    fireEvent.change(amountInput, { target: { value: '500' } });

    expect(screen.getByText(/分配金額の合計が価格と一致しません/)).toBeInTheDocument();
    expect(screen.getByText('商品を登録する')).toBeDisabled();
  });

  it('金額合計が価格と一致する場合にチェックマークが表示される', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // 受取人1人で金額1000（自動セット済み）
    expect(screen.getByText(/合計 1000 JPYC = 価格と一致/)).toBeInTheDocument();
  });

  it('送信成功時に完了メッセージが表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProductRegisterForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: 'テスト商品' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

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

    // basis points に変換されていることを確認 (100% → 10000)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.splits[0].percentage).toBe(10000);
  });

  it('140JPYCを130と10に分配するとbasis pointsが正しく計算される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProductRegisterForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: '分配テスト' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '140' } });

    // 受取人を追加
    fireEvent.click(screen.getByText('+ 受取人を追加'));
    const addressInputs = screen.getAllByPlaceholderText('受取アドレス (0x...)');
    fireEvent.change(addressInputs[1], { target: { value: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } });

    // 金額を設定: 130 + 10 = 140
    const amountInputs = screen.getAllByPlaceholderText('金額');
    fireEvent.change(amountInputs[0], { target: { value: '130' } });
    fireEvent.change(amountInputs[1], { target: { value: '10' } });

    fireEvent.click(screen.getByText('商品を登録する'));

    await waitFor(() => {
      expect(screen.getByText('商品が正常に登録されました!')).toBeInTheDocument();
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // 130/140 = 9285bp (floor), 10/140 → 10000-9285 = 715bp
    expect(callBody.splits[0].percentage).toBe(9285);
    expect(callBody.splits[1].percentage).toBe(715);
    expect(callBody.splits[0].percentage + callBody.splits[1].percentage).toBe(10000);
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
