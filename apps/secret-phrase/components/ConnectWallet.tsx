'use client';

import type { Connector } from 'wagmi';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function getConnectorLabel(connector: Connector): string {
  if (connector.id === 'coinbaseWalletSDK' || connector.type === 'coinbaseWallet') {
    return 'Connect Smart Wallet';
  }
  if (connector.id === 'injected' || connector.type === 'injected') {
    return 'Connect Wallet';
  }
  return `Connect ${connector.name}`;
}

export function ConnectWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isReconnecting) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-phrase-blue border-t-transparent' />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className='mx-auto flex w-full max-w-sm animate-fade-in-up flex-col gap-3'>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className='w-full animate-glow-pulse rounded-xl border border-phrase-blue/50 bg-transparent px-6 py-3.5 font-semibold text-phrase-blue transition-all duration-300 hover:bg-phrase-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-40 '
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                Connecting...
              </span>
            ) : (
              getConnectorLabel(connector)
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className='flex animate-fade-in items-center gap-3 rounded-full border border-gray-800 bg-phrase-dim px-4 py-2'>
      <div className='h-2 w-2 animate-dot-pulse rounded-full bg-phrase-blue' />
      <span className='font-mono text-gray-300 text-sm'>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className='ml-1 text-gray-500 text-xs transition-colors hover:text-gray-300'
      >
        Disconnect
      </button>
    </div>
  );
}
