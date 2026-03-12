import { NextRequest, NextResponse } from 'next/server';
import { getAdminWalletClient, getPublicClient } from '@/lib/viem-admin';
import { prisma } from '@/lib/prisma';
import { parseEther, decodeEventLog, getAddress } from 'viem';

const REGISTER_ABI = [
  {
    name: 'registerProduct',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_price', type: 'uint256' },
      { name: '_recipients', type: 'address[]' },
      { name: '_amounts', type: 'uint256[]' },
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

    // 分配先アドレスのバリデーション
    for (const s of splits) {
      if (!s.recipientAddress || !s.recipientAddress.startsWith('0x')) {
        return NextResponse.json({ error: '受取アドレスが入力されていません。ウォレットアドレスを設定してください。' }, { status: 400 });
      }
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

    // 分配金額の合計チェック
    const totalSplitAmount = splits.reduce(
      (sum: number, s: { amount: string }) => sum + parseFloat(s.amount),
      0
    );
    if (Math.abs(totalSplitAmount - parseFloat(priceJPYC)) > 0.01) {
      return NextResponse.json(
        { error: '分配金額の合計が商品価格と一致しません' },
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
      (s: { recipientAddress: string }) => getAddress(s.recipientAddress)
    );
    const amounts = splits.map((s: { amount: string }) => parseEther(s.amount.toString()));

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: REGISTER_ABI,
      functionName: 'registerProduct',
      args: [priceInWei, recipients, amounts],
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

    // DB用のpercentage(basis points)を金額から計算
    const price = parseFloat(priceJPYC);
    const dbSplits = splits.map(
      (s: { recipientAddress: string; amount: string }, i: number) => {
        const amt = parseFloat(s.amount);
        const bp = i === splits.length - 1
          ? 10000 - splits.slice(0, -1).reduce((sum: number, ss: { amount: string }) =>
              sum + Math.floor((parseFloat(ss.amount) / price) * 10000), 0)
          : Math.floor((amt / price) * 10000);
        return {
          recipientAddress: s.recipientAddress,
          percentage: bp,
        };
      }
    );

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
          create: dbSplits,
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
