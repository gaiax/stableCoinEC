/**
 * CheckoutButton コンポーネントテスト
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutButton } from '../CheckoutButton';

// モック: next-auth/react
const mockUseSession = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// モック: fetch (住所取得)
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ addresses: [] }),
}) as jest.Mock;

// モック: wagmi
const mockWriteContract = jest.fn();
const mockUseAccount = jest.fn();
jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useWriteContract: () => ({
    writeContract: mockWriteContract,
  }),
  useWaitForTransactionReceipt: () => ({
    isSuccess: false,
  }),
}));

describe('CheckoutButton', () => {
  const defaultProps = {
    productId: 'product-1',
    onChainProductId: BigInt(0),
    priceJPYC: '1000',
    stock: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_JPYC_ADDRESS = '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB';
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
    // デフォルト: ログイン済み
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com', role: 'BUYER', shopId: null } },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ addresses: [] }),
    });
  });

  it('ウォレット未接続時に接続促すボタンを表示', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('ウォレットを接続してください')).toBeInTheDocument();
    expect(screen.getByText('ウォレットを接続してください').closest('button')).toBeDisabled();
  });

  it('ウォレット接続時に購入ボタンを表示', () => {
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('購入する (1000 JPYC)')).toBeInTheDocument();
    expect(screen.getByText('購入する (1000 JPYC)').closest('button')).toBeEnabled();
  });

  it('在庫0で売り切れ表示', () => {
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} stock={0} />);
    expect(screen.getByText('売り切れ')).toBeInTheDocument();
    expect(screen.getByText('売り切れ').closest('button')).toBeDisabled();
  });

  it('ログイン済み・住所未選択で購入クリック時にエラー表示', () => {
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByText('購入する (1000 JPYC)'));
    expect(screen.getByText('配送先住所を選択してください')).toBeInTheDocument();
    expect(mockWriteContract).not.toHaveBeenCalled();
  });

  it('未ログイン時に購入クリックでapproveが呼ばれる', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByText('購入する (1000 JPYC)'));

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'approve',
      }),
      expect.any(Object)
    );
  });

  it('配送先住所セクションが表示される（ログイン済み）', () => {
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('配送先住所')).toBeInTheDocument();
  });

  it('未ログイン時にログイン促すメッセージ表示', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('ログイン')).toBeInTheDocument();
  });
});
