'use client';

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectWallet } from '../components/ConnectWallet';
import { PassphraseForm } from '../components/PassphraseForm';
import { MintButton } from '../components/MintButton';

type Step = 'connect' | 'passphrase' | 'mint' | 'success';

const STEP_SUBTITLES: Record<Step, string> = {
  connect: 'Connect your wallet to begin the descent',
  passphrase: 'Enter the code hidden in the stairwell',
  mint: 'Claim your Welcome Pass — gas is on us',
  success: 'You found the secret. Welcome to the inside.',
};

export default function Page() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [step, setStep] = useState<Step>('connect');

  const currentStep = !isConnected ? 'connect' : step === 'connect' ? 'passphrase' : step;

  const handleDisconnect = () => {
    disconnect();
    setStep('connect');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 animate-fade-in">
      {isConnected && address && (
        <div className="fixed top-4 right-4 z-10 flex items-center gap-3 rounded-full bg-stairs-dim border border-gray-800 px-4 py-2 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-stairs-blue animate-dot-pulse" />
          <span className="font-mono text-sm text-gray-300">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1"
          >
            Disconnect
          </button>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <div className="mb-3">
            <StaircaseIcon />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight text-glow mb-2">
            SECRET STAIRS
          </h1>
          <p className="text-gray-400 text-sm tracking-wide">
            {STEP_SUBTITLES[currentStep]}
          </p>
        </div>

        <StepIndicator current={currentStep} />

        <div className="w-full animate-fade-in-up" key={currentStep}>
          {currentStep === 'connect' && <ConnectWallet />}

          {currentStep === 'passphrase' && (
            <PassphraseForm onVerified={() => setStep('mint')} />
          )}

          {currentStep === 'mint' && (
            <MintButton onSuccess={() => setStep('success')} />
          )}

          {currentStep === 'success' && <SuccessScreen />}
        </div>
      </div>
    </div>
  );
}

function StaircaseIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
      <rect x="4" y="36" width="12" height="8" rx="1" fill="#0052FF" opacity="0.4" />
      <rect x="14" y="28" width="12" height="16" rx="1" fill="#0052FF" opacity="0.6" />
      <rect x="24" y="20" width="12" height="24" rx="1" fill="#0052FF" opacity="0.8" />
      <rect x="34" y="12" width="10" height="32" rx="1" fill="#0052FF" />
      <rect x="4" y="36" width="40" height="1" fill="#3380FF" opacity="0.3" />
    </svg>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['connect', 'passphrase', 'mint', 'success'];
  const currentIndex = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 w-full max-w-xs justify-center">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`
              w-2.5 h-2.5 rounded-full transition-all duration-500
              ${i < currentIndex ? 'bg-stairs-blue' : ''}
              ${i === currentIndex ? 'bg-stairs-blue animate-dot-pulse' : ''}
              ${i > currentIndex ? 'bg-gray-700' : ''}
            `}
          />
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-px mx-1 transition-colors duration-500 ${
                i < currentIndex ? 'bg-stairs-blue' : 'bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-scale-in">
      <div className="relative">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-stairs-blue to-blue-800 p-[1px] box-glow-strong">
          <div className="w-full h-full rounded-2xl bg-stairs-dark flex flex-col items-center justify-center gap-2">
            <StaircaseIcon />
            <p className="text-white font-bold text-sm">WELCOME PASS</p>
            <p className="text-stairs-glow text-xs font-mono">Secret Stairs</p>
          </div>
        </div>
        <Sparkles />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">You&apos;re in.</h2>
        <p className="text-gray-400 text-sm">
          Your Welcome Pass has been minted to your wallet.
          <br />
          Welcome to Coinbase HQ.
        </p>
      </div>
    </div>
  );
}

function Sparkles() {
  const positions = [
    { top: '-8px', left: '-8px', delay: '0s' },
    { top: '-4px', right: '-10px', delay: '0.2s' },
    { bottom: '-6px', left: '20%', delay: '0.4s' },
    { bottom: '-8px', right: '15%', delay: '0.1s' },
    { top: '30%', left: '-12px', delay: '0.3s' },
    { top: '40%', right: '-10px', delay: '0.5s' },
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <div
          key={`sparkle-${pos.delay}`}
          className="absolute w-1.5 h-1.5 bg-stairs-glow rounded-full animate-sparkle"
          style={{ ...pos, animationDelay: pos.delay }}
        />
      ))}
    </>
  );
}
