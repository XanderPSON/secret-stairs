'use client';

import { useEffect, useState } from 'react';
import {
  useSendCalls,
  useCallsStatus,
  useAccount,
  useReadContract,
} from 'wagmi';
import { encodeFunctionData } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { welcomeNftAbi } from '../constants';
import { WELCOME_NFT_ADDRESS, PAYMASTER_SERVICE_URL } from '../config';

interface MintButtonProps {
  onSuccess: () => void;
}

export function MintButton({ onSuccess }: MintButtonProps) {
  const { address } = useAccount();
  const [txId, setTxId] = useState<string>();

  const { data: alreadyMinted } = useReadContract({
    address: WELCOME_NFT_ADDRESS,
    abi: welcomeNftAbi,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  });

  const { sendCalls, isPending, error: sendError } = useSendCalls();

  const { data: callsStatus } = useCallsStatus({
    id: txId as string,
    query: { enabled: !!txId, refetchInterval: 1000 },
  });

  useEffect(() => {
    if (callsStatus?.status === 'success') {
      onSuccess();
    }
  }, [callsStatus?.status, onSuccess]);

  if (alreadyMinted) {
    return (
      <div className="text-center">
        <p className="text-green-400 font-semibold">You already minted your Welcome Pass! 🎉</p>
      </div>
    );
  }

  const handleMint = () => {
    if (!address) return;

    const mintData = encodeFunctionData({
      abi: welcomeNftAbi,
      functionName: 'mint',
      args: [address],
    });

    sendCalls(
      {
        calls: [
          {
            to: WELCOME_NFT_ADDRESS,
            data: mintData,
            value: 0n,
          },
        ],
        capabilities: {
          paymasterService: {
            url: PAYMASTER_SERVICE_URL,
          },
        },
      },
      {
        onSuccess: (data) => setTxId(data.id),
      },
    );
  };

  const isConfirming = txId && callsStatus?.status === 'pending';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      <button
        onClick={handleMint}
        disabled={isPending || !!isConfirming}
        className="w-full rounded-xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? 'Confirm in Wallet...'
          : isConfirming
            ? 'Minting...'
            : 'Mint Welcome Pass 🎫'}
      </button>
      {sendError && (
        <p className="text-red-400 text-sm text-center">
          {sendError.message.includes('User rejected')
            ? 'Transaction cancelled.'
            : 'Mint failed. Try again.'}
        </p>
      )}
      {isConfirming && (
        <p className="text-gray-400 text-sm animate-pulse">
          Waiting for confirmation...
        </p>
      )}
    </div>
  );
}
