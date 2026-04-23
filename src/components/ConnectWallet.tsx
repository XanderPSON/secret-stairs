'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isReconnecting) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-stairs-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm animate-fade-in-up">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="
              w-full rounded-xl px-6 py-3.5 font-semibold
              bg-transparent text-stairs-blue
              border border-stairs-blue/50
              hover:bg-stairs-blue hover:text-white
              transition-all duration-300
              disabled:opacity-40 disabled:cursor-not-allowed
              animate-glow-pulse
            "
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              `Connect ${connector.name}`
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-stairs-dim border border-gray-800 px-4 py-2 animate-fade-in">
      <div className="w-2 h-2 rounded-full bg-stairs-blue animate-dot-pulse" />
      <span className="font-mono text-sm text-gray-300">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1"
      >
        Disconnect
      </button>
    </div>
  );
}
