'use client';

import { writeContract } from '@wagmi/core';
import { useEffect, useState } from 'react';
import { encodeFunctionData, numberToHex } from 'viem';
import {
  useAccount,
  useCallsStatus,
  useConnectorClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { welcomeNftAbi } from '../constants';
import type { Location } from '../lib/locations';

function isSmartWalletConnector(
  id: string | undefined,
  type: string | undefined,
): boolean {
  return id === 'coinbaseWalletSDK' || type === 'coinbaseWallet';
}

export function mintButtonLabel(
  location: Location,
  isPending: boolean,
  isConfirming: boolean,
): string {
  if (isPending) { return 'Confirm in Wallet...'; }
  if (isConfirming) { return 'Minting...'; }
  return `Mint ${location.passName}`;
}

interface MintButtonProps {
  onSuccess: () => void;
  location: Location;
}

export function MintButton({ onSuccess, location }: MintButtonProps) {
  const contractAddress = location.contractAddress;
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

  const isWrongChain =
    connectedChainId !== undefined && connectedChainId !== baseSepolia.id;
  const isSmartWallet = isSmartWalletConnector(connector?.id, connector?.type);

  const {
    data: alreadyMinted,
    isLoading: isCheckingMinted,
    error: hasMintedError,
    refetch: refetchHasMinted,
  } = useReadContract({
    address: contractAddress ?? undefined,
    abi: welcomeNftAbi,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address && !!contractAddress },
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

  if (!contractAddress) {
    return (
      <div className='mx-auto flex w-full max-w-sm animate-fade-in-up flex-col items-center gap-3 text-center'>
        <div className='w-full rounded-xl border border-yellow-500/30 bg-phrase-dim p-4'>
          <p className='font-semibold text-sm text-white'>Coming soon</p>
          <p className='mt-1 text-gray-400 text-xs'>
            The {location.passName} contract isn&apos;t deployed yet. Check back
            shortly.
          </p>
        </div>
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className='mx-auto flex w-full max-w-sm animate-fade-in-up flex-col items-center gap-4 text-center'>
        <p className='text-sm text-yellow-400'>
          Your wallet is on chain {connectedChainId}. Switch to Base Sepolia to
          mint.
        </p>
        <button
          type="button"
          onClick={() => {
            switchChainAsync({ chainId: baseSepolia.id }).catch((err) => {
              console.error('[MintButton] switchChain error:', err);
            });
          }}
          disabled={isSwitchingChain}
          className='box-glow w-full rounded-xl bg-gradient-to-r from-phrase-blue to-blue-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:from-blue-600 hover:to-phrase-blue disabled:cursor-not-allowed disabled:opacity-40 '
        >
          {isSwitchingChain ? 'Switching…' : 'Switch to Base Sepolia'}
        </button>
      </div>
    );
  }

  if (isCheckingMinted) {
    return (
      <div className='flex animate-fade-in-up items-center justify-center py-8'>
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-phrase-blue border-t-transparent' />
      </div>
    );
  }

  if (hasMintedError) {
    return (
      <div className='flex animate-fade-in-up flex-col items-center gap-3 text-center'>
        <p className="text-red-400 text-sm">
          Couldn&apos;t check mint status on Base Sepolia.
        </p>
        <p className='break-all text-gray-500 text-xs'>
          {hasMintedError.message}
        </p>
        <button
          type="button"
          onClick={() => refetchHasMinted()}
          className="text-phrase-blue text-xs underline hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (alreadyMinted) {
    return (
      <div className='flex animate-fade-in-up flex-col items-center gap-3'>
        <div className='box-glow-green w-full rounded-xl border border-green-500/30 bg-phrase-dim p-4'>
          <div className="flex items-center gap-3">
            <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20'>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" role="img" aria-label="Success checkmark">
                <title>Success checkmark</title>
                <path
                  d="M1 5L5 9L13 1"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className='font-semibold text-sm text-white'>
                Already claimed
              </p>
              <p className='mt-1 break-all font-mono text-gray-400 text-xs'>
                {address}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMint = async () => {
    if (!address || !contractAddress) { return; }

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

        // Route paymaster requests through our own /api/paymaster proxy so
        // the CDP API key stays server-side. The wallet POSTs the userOp to
        // this URL and our route forwards it to CDP.
        const paymasterProxyUrl = `${window.location.origin}/api/paymaster`;

        const params = [
          {
            version: '1.0',
            chainId: numberToHex(baseSepolia.id),
            from: address,
            calls: [
              {
                to: contractAddress,
                data: mintData,
                value: '0x0',
              },
            ],
            capabilities: {
              paymasterService: { url: paymasterProxyUrl },
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
          address: contractAddress,
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
    <div className='mx-auto flex w-full max-w-sm animate-fade-in-up flex-col items-center gap-4'>
      {!isSmartWallet && (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className='text-xs text-yellow-400/80'>
            Heads up: this wallet pays its own gas. Connect a Smart Wallet for a
            sponsored mint.
          </p>
          <a
            href="https://portal.cdp.coinbase.com/products/faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-phrase-blue text-xs underline hover:text-blue-300"
          >
            Need Base Sepolia ETH? Get some from the faucet →
          </a>
        </div>
      )}
      <button
        type="button"
        onClick={handleMint}
        disabled={isPending || isConfirming}
        className='box-glow w-full rounded-xl bg-gradient-to-r from-phrase-blue to-blue-600 px-6 py-4 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:from-blue-600 hover:to-phrase-blue active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 '
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white' />
            {mintButtonLabel(location, isPending, isConfirming)}
          </span>
        ) : (
          mintButtonLabel(location, isPending, isConfirming)
        )}
      </button>

      {sendError && (
        <div className='w-full text-center'>
          <p className="text-red-400 text-sm">
            {sendError.message.includes('User rejected')
              ? 'Transaction cancelled.'
              : 'Mint failed.'}
          </p>
          <p className='mt-1 break-all text-red-400/60 text-xs'>
            {sendError.message}
          </p>
        </div>
      )}

      {isConfirming && (
        <p className='animate-pulse text-gray-500 text-xs'>
          Waiting for confirmation on Base Sepolia...
        </p>
      )}
    </div>
  );
}
