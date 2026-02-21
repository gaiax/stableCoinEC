/**
 * ConnectButton コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { ConnectButton } from '../ConnectButton';

// RainbowKit ConnectButton.Custom のモック
type CustomRenderProps = {
  account: { address: string; displayName: string } | null;
  chain: { unsupported: boolean } | null;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
  mounted: boolean;
};

let mockRenderFn: ((props: CustomRenderProps) => React.ReactNode) | null = null;

jest.mock('@rainbow-me/rainbowkit', () => {
  const CustomButton = ({ children }: { children: (props: CustomRenderProps) => React.ReactNode }) => {
    mockRenderFn = children;
    return <>{children(mockProps)}</>;
  };
  return {
    ConnectButton: {
      Custom: CustomButton,
    },
  };
});

// wagmi hooks モック
const mockUseReadContract = jest.fn();
jest.mock('wagmi', () => ({
  useReadContract: (...args: unknown[]) => mockUseReadContract(...args),
}));

// viem モック
jest.mock('viem', () => ({
  erc20Abi: [],
  formatUnits: (val: bigint, decimals: number) => {
    // 簡易的に10^decimalsで割った文字列を返す
    const divisor = BigInt(10) ** BigInt(decimals);
    return (val / divisor).toString();
  },
}));

// デフォルトの render props
let mockProps: CustomRenderProps = {
  account: null,
  chain: null,
  openAccountModal: jest.fn(),
  openChainModal: jest.fn(),
  openConnectModal: jest.fn(),
  mounted: true,
};

describe('ConnectButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReadContract.mockReturnValue({ data: undefined });
    mockProps = {
      account: null,
      chain: null,
      openAccountModal: jest.fn(),
      openChainModal: jest.fn(),
      openConnectModal: jest.fn(),
      mounted: true,
    };
  });

  it('未接続時に「ウォレット接続」ボタンが表示される', () => {
    render(<ConnectButton />);
    expect(screen.getByText('ウォレット接続')).toBeInTheDocument();
  });

  it('接続済みでアドレスとJPYC残高が表示される', () => {
    mockProps = {
      ...mockProps,
      account: { address: '0x1234567890abcdef1234567890abcdef12345678', displayName: '0x1234...5678' },
      chain: { unsupported: false },
    };
    mockUseReadContract.mockReturnValue({ data: BigInt('1000000000000000000000') }); // 1000 * 10^18

    render(<ConnectButton />);
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText(/1,000 JPYC/)).toBeInTheDocument();
  });

  it('残高取得中に「... JPYC」と表示される', () => {
    mockProps = {
      ...mockProps,
      account: { address: '0x1234567890abcdef1234567890abcdef12345678', displayName: '0x1234...5678' },
      chain: { unsupported: false },
    };
    mockUseReadContract.mockReturnValue({ data: undefined });

    render(<ConnectButton />);
    expect(screen.getByText('... JPYC')).toBeInTheDocument();
  });

  it('チェーンが未サポートの場合に「ネットワーク切替」ボタンが表示される', () => {
    mockProps = {
      ...mockProps,
      account: { address: '0x1234567890abcdef1234567890abcdef12345678', displayName: '0x1234...5678' },
      chain: { unsupported: true },
    };

    render(<ConnectButton />);
    expect(screen.getByText('ネットワーク切替')).toBeInTheDocument();
  });
});
