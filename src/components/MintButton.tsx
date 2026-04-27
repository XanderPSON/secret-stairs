'use client';

import { useEffect, useState } from 'react';
import {
  useCallsStatus,
  useAccount,
  useReadContract,
  useConnectorClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { writeContract } from '@wagmi/core';
import { useConfig } from 'wagmi';
import { encodeFunctionData, numberToHex } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { welcomeNftAbi } from '../constants';
import { WELCOME_NFT_ADDRESS, PAYMASTER_SERVICE_URL } from '../config';

function isSmartWalletConnector(id: string | undefined, type: string | undefined): boolean {
  return id === 'coinbaseWalletSDK' || type === 'coinbaseWallet';
}

interface MintButtonProps {
  onSuccess: () => void;
}

export function MintButton({ onSuccess }: MintButtonProps) {
  const { address, chainId: connectedChainId, connector } = useAccount();
  const config = useConfig();
  const { data: connectorClient, error: clientError } = useConnectorClient({
    chainId: baseSepolia.id,
  });
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const [txId, setTxId] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [isPending, setIsPending] = useState(false);
  const [sendError, setSendError] = useState<Error | null>(null);

  const isWrongChain = connectedChainId !== undefined && connectedChainId !== baseSepolia.id;
  const isSmartWallet = isSmartWalletConnector(connector?.id, connector?.type);

  const {
    data: alreadyMinted,
    isLoading: isCheckingMinted,
    error: hasMintedError,
    refetch: refetchHasMinted,
  } = useReadContract({
    address: WELCOME_NFT_ADDRESS,
    abi: welcomeNftAbi,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });

  const { data: callsStatus } = useCallsStatus({
    id: txId as string,
    query: { enabled: !!txId, refetchInterval: 1000 },
  });

  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: baseSepolia.id,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (callsStatus?.status === 'success' || txReceipt?.status === 'success') {
      onSuccess();
    }
  }, [callsStatus?.status, txReceipt?.status, onSuccess]);

  if (isWrongChain) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in-up text-center w-full max-w-sm">
        <p className="text-yellow-400 text-sm">
          Your wallet is on chain {connectedChainId}. Switch to Base Sepolia to mint.
        </p>
        <button
          type="button"
          onClick={() => {
            switchChainAsync({ chainId: baseSepolia.id }).catch((err) => {
              console.error('[MintButton] switchChain error:', err);
            });
          }}
          disabled={isSwitchingChain}
          className="
            w-full rounded-xl px-6 py-3 font-semibold text-white
            bg-gradient-to-r from-stairs-blue to-blue-600
            hover:from-blue-600 hover:to-stairs-blue
            transition-all duration-300
            disabled:opacity-40 disabled:cursor-not-allowed
            box-glow
          "
        >
          {isSwitchingChain ? 'Switching…' : 'Switch to Base Sepolia'}
        </button>
      </div>
    );
  }

  if (isCheckingMinted) {
    return (
      <div className="flex items-center justify-center py-8 animate-fade-in-up">
        <div className="w-5 h-5 border-2 border-stairs-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasMintedError) {
    return (
      <div className="flex flex-col items-center gap-3 animate-fade-in-up text-center">
        <p className="text-red-400 text-sm">
          Couldn&apos;t check mint status on Base Sepolia.
        </p>
        <p className="text-gray-500 text-xs break-all">
          {hasMintedError.message}
        </p>
        <button
          type="button"
          onClick={() => refetchHasMinted()}
          className="text-stairs-blue text-xs underline hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

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
              <p className="text-gray-400 text-xs font-mono break-all mt-1">
                {address}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMint = async () => {
    if (!address) return;

    setIsPending(true);
    setSendError(null);

    try {
      if (isSmartWallet) {
        if (!connectorClient) {
          const reason = clientError
            ? `Wallet client unavailable: ${clientError.message}`
            : 'Wallet client not ready. Try refreshing or reconnecting.';
          throw new Error(reason);
        }

        const mintData = encodeFunctionData({
          abi: welcomeNftAbi,
          functionName: 'mint',
          args: [address],
        });

        const params = [
          {
            version: '1.0',
            chainId: numberToHex(baseSepolia.id),
            from: address,
            calls: [
              {
                to: WELCOME_NFT_ADDRESS,
                data: mintData,
                value: '0x0',
              },
            ],
            capabilities: {
              paymasterService: { url: PAYMASTER_SERVICE_URL },
            },
          },
        ];

        const result = (await connectorClient.request({
          method: 'wallet_sendCalls',
          params,
        } as never)) as { id: string } | string;

        setTxId(typeof result === 'string' ? result : result.id);
      } else {
        const hash = await writeContract(config, {
          address: WELCOME_NFT_ADDRESS,
          abi: welcomeNftAbi,
          functionName: 'mint',
          args: [address],
          chainId: baseSepolia.id,
          account: address,
        });
        setTxHash(hash);
      }
    } catch (err) {
      console.error('[MintButton] mint error:', err);
      setSendError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  const isConfirming =
    (!!txId && callsStatus?.status === 'pending') ||
    (!!txHash && txReceipt?.status !== 'success');

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-fade-in-up">
      {!isSmartWallet && (
        <p className="text-yellow-400/80 text-xs text-center">
          Heads up: this wallet pays its own gas. Connect a Smart Wallet for a sponsored mint.
        </p>
      )}
      <button
        onClick={handleMint}
        disabled={isPending || isConfirming}
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
        <div className="text-center w-full">
          <p className="text-red-400 text-sm">
            {sendError.message.includes('User rejected')
              ? 'Transaction cancelled.'
              : 'Mint failed.'}
          </p>
          <p className="text-red-400/60 text-xs mt-1 break-all">
            {sendError.message}
          </p>
        </div>
      )}

      {isConfirming && (
        <p className="text-gray-500 text-xs animate-pulse">
          Waiting for confirmation on Base Sepolia...
        </p>
      )}
    </div>
  );
}
