import { NextRequest, NextResponse } from 'next/server';
import { getAdminWalletClient, getPublicClient } from '@/lib/viem-admin';
import { prisma } from '@/lib/prisma';
import { parseEther } from 'viem';

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
] as const;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { shopId, title, description, imageUrl, priceJPYC, splits } = body;

    if (!shopId || !title || !priceJPYC || !splits?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    const product = await prisma.product.create({
      data: {
        shopId,
        title,
        description,
        imageUrl,
        priceJPYC: priceJPYC,
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
      },
      include: { splits: true },
    });

    return NextResponse.json({ success: true, product, txHash });
  } catch (error) {
    console.error('Product registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
