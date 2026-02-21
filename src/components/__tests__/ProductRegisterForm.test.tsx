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

  it('初期の分配率が100%になっている', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    const pctInput = screen.getByPlaceholderText('% (例: 50)');
    expect(pctInput).toHaveValue(100);
    expect(screen.getByText(/合計 100%/)).toBeInTheDocument();
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

  it('パーセンテージ変更で金額が連動する', () => {
    render(<ProductRegisterForm {...defaultProps} />);

    // 価格を入力
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // パーセンテージを50に変更
    const pctInput = screen.getByPlaceholderText('% (例: 50)');
    fireEvent.change(pctInput, { target: { value: '50' } });

    // 金額が500になること
    const amountInput = screen.getByPlaceholderText('金額');
    expect(amountInput).toHaveValue(500);
  });

  it('金額変更でパーセンテージが連動する', () => {
    render(<ProductRegisterForm {...defaultProps} />);

    // 価格を入力
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // 金額を250に変更
    const amountInput = screen.getByPlaceholderText('金額');
    fireEvent.change(amountInput, { target: { value: '250' } });

    // パーセンテージが25になること
    const pctInput = screen.getByPlaceholderText('% (例: 50)');
    expect(pctInput).toHaveValue(25);
  });

  it('合計100%でない場合に警告が表示される', () => {
    render(<ProductRegisterForm {...defaultProps} />);

    // パーセンテージを50に変更
    const pctInput = screen.getByPlaceholderText('% (例: 50)');
    fireEvent.change(pctInput, { target: { value: '50' } });

    // 警告メッセージ
    expect(screen.getByText(/分配比率の合計が100%になっていません/)).toBeInTheDocument();
    expect(screen.getByText(/現在: 50%/)).toBeInTheDocument();

    // ボタンが disabled
    const submitButton = screen.getByText('商品を登録する');
    expect(submitButton).toBeDisabled();
  });

  it('商品価格が未入力の場合は金額フィールドが無効になる', () => {
    render(<ProductRegisterForm {...defaultProps} />);
    const amountInput = screen.getByPlaceholderText('金額');
    expect(amountInput).toBeDisabled();
  });

  it('送信成功時に完了メッセージが表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProductRegisterForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('商品名 *'), { target: { value: 'テスト商品' } });
    fireEvent.change(screen.getByLabelText('価格 (JPYC) *'), { target: { value: '1000' } });

    // percentage はデフォルト100%のまま
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
