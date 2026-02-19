import { NextRequest, NextResponse } from 'next/server';
import { getAdminWalletClient, getPublicClient } from '@/lib/viem-admin';
import { prisma } from '@/lib/prisma';
import { parseEther, decodeEventLog } from 'viem';

const REGISTER_ABI = [
  {
    name: 'registerProduct',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_price', type: 'uint256' },
      { name: '_recipients', type: 'address[]' },
      { name: '_basisPoints', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ProductRegistered',
    type: 'event',
    inputs: [
      { name: 'productId', type: 'uint256', indexed: true },
      { name: 'price', type: 'uint256', indexed: false },
    ],
  },
] as const;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { shopId, title, description, imageUrl, additionalImageUrls, priceJPYC, splits, stock } = body;

    if (!shopId || !title || !priceJPYC || !splits?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 特商法の必須項目チェック
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        legalBusinessName: true,
        legalAddress: true,
        legalPhone: true,
        legalEmail: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'ショップが見つかりません' }, { status: 404 });
    }

    if (!shop.legalBusinessName || !shop.legalAddress || !shop.legalPhone || !shop.legalEmail) {
      return NextResponse.json(
        { error: '商品を登録するには、特定商取引法に基づく表記（事業者名・住所・電話番号・メールアドレス）の設定が必要です' },
        { status: 400 }
      );
    }

    const totalPercentage = splits.reduce(
      (sum: number, s: { percentage: number }) => sum + s.percentage,
      0
    );
    if (totalPercentage !== 10000) {
      return NextResponse.json(
        { error: 'Split percentages must total 10000 basis points' },
        { status: 400 }
      );
    }

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 });
    }

    const walletClient = getAdminWalletClient();
    const publicClient = getPublicClient();

    const priceInWei = parseEther(priceJPYC.toString());
    const recipients = splits.map(
      (s: { recipientAddress: string }) => s.recipientAddress as `0x${string}`
    );
    const basisPoints = splits.map((s: { percentage: number }) => BigInt(s.percentage));

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: REGISTER_ABI,
      functionName: 'registerProduct',
      args: [priceInWei, recipients, basisPoints],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    // ProductRegisteredイベントからonChainProductIdを取得
    let onChainProductId: bigint | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: REGISTER_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'ProductRegistered') {
          onChainProductId = decoded.args.productId;
          break;
        }
      } catch {
        // 他のコントラクトのログはスキップ
      }
    }

    const product = await prisma.product.create({
      data: {
        shopId,
        title,
        description,
        imageUrl,
        priceJPYC: priceJPYC,
        stock: stock != null ? Number(stock) : 0,
        onChainProductId,
        txHash,
        isPublished: true,
        splits: {
          create: splits.map(
            (s: { recipientAddress: string; percentage: number }) => ({
              recipientAddress: s.recipientAddress,
              percentage: s.percentage,
            })
          ),
        },
        images: {
          create: (additionalImageUrls ?? []).map((url: string, index: number) => ({
            imageUrl: url,
            sortOrder: index,
          })),
        },
      },
      include: { splits: true, images: true },
    });

    // BigInt / Decimal はJSONシリアライズ不可のため文字列変換
    const serialized = {
      ...product,
      onChainProductId: product.onChainProductId?.toString() ?? null,
      priceJPYC: product.priceJPYC.toString(),
    };

    return NextResponse.json({ success: true, product: serialized, txHash });
  } catch (error) {
    console.error('Product registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
