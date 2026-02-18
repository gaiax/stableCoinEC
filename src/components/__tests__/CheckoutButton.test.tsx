/**
 * CheckoutButton コンポーネントテスト
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutButton } from '../CheckoutButton';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_JPYC_ADDRESS = '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB';
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  });

  it('ウォレット未接続時に接続促すボタンを表示', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('ウォレットを接続してください')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('ウォレット接続時に購入ボタンを表示', () => {
    mockUseAccount.mockReturnValue({
      address: '0xbuyer',
      isConnected: true,
    });
    render(<CheckoutButton {...defaultProps} />);
    expect(screen.getByText('購入する (1000 JPYC)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('購入ボタンクリックでapproveが呼ばれる', () => {
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
});
