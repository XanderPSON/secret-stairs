'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../components/ConnectWallet';
import { PassphraseForm } from '../components/PassphraseForm';
import { MintButton } from '../components/MintButton';

type Step = 'connect' | 'passphrase' | 'mint' | 'success';

export default function Page() {
  const { isConnected } = useAccount();
  const [step, setStep] = useState<Step>('connect');

  const currentStep = !isConnected ? 'connect' : step === 'connect' ? 'passphrase' : step;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🔑 Secret Stairs</h1>
          <p className="text-gray-400">
            {currentStep === 'connect' && 'Connect your wallet to get started'}
            {currentStep === 'passphrase' && 'Enter the secret phrase'}
            {currentStep === 'mint' && 'Mint your free Welcome Pass'}
            {currentStep === 'success' && 'Welcome to the club!'}
          </p>
        </div>

        <StepIndicator current={currentStep} />

        {currentStep === 'connect' && <ConnectWallet />}

        {currentStep === 'passphrase' && (
          <PassphraseForm onVerified={() => setStep('mint')} />
        )}

        {currentStep === 'mint' && (
          <MintButton onSuccess={() => setStep('success')} />
        )}

        {currentStep === 'success' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-white">You&apos;re in!</h2>
            <p className="text-gray-400">
              Your Welcome Pass NFT has been minted to your wallet.
              Welcome to Coinbase HQ.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'connect', label: 'Connect' },
    { key: 'passphrase', label: 'Verify' },
    { key: 'mint', label: 'Mint' },
    { key: 'success', label: 'Done' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2 w-full max-w-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1">
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-blue-500' : 'bg-gray-700'
            }`}
          />
        </div>
      ))}
    </div>
  );
}
