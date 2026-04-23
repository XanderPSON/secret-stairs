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
      <div className="flex flex-col items-center gap-3 animate-fade-in-up">
        <div className="w-full rounded-xl bg-stairs-dim border border-green-500/30 p-4 box-glow-green">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1 5L5 9L13 1" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Already claimed</p>
              <p className="text-gray-400 text-xs">Your Welcome Pass is in your wallet</p>
            </div>
          </div>
        </div>
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
    <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-fade-in-up">
      <button
        onClick={handleMint}
        disabled={isPending || !!isConfirming}
        className="
          w-full rounded-xl px-6 py-4 font-semibold text-white
          bg-gradient-to-r from-stairs-blue to-blue-600
          hover:from-blue-600 hover:to-stairs-blue
          transition-all duration-300
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:scale-[1.02] active:scale-[0.98]
          box-glow
        "
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Confirm in Wallet...
          </span>
        ) : isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Minting...
          </span>
        ) : (
          'Mint Welcome Pass'
        )}
      </button>

      {sendError && (
        <p className="text-red-400 text-sm text-center">
          {sendError.message.includes('User rejected')
            ? 'Transaction cancelled.'
            : 'Mint failed. Try again.'}
        </p>
      )}

      {isConfirming && (
        <p className="text-gray-500 text-xs animate-pulse">
          Waiting for confirmation on Base Sepolia...
        </p>
      )}
    </div>
  );
}
