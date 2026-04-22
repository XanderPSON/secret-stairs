'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isReconnecting) {
    return (
      <div className="text-gray-400 text-sm animate-pulse">
        Reconnecting...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-800 px-4 py-2">
      <span className="font-mono text-sm text-gray-300">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
