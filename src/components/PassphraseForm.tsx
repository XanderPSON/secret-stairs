'use client';

import { useState } from 'react';

interface PassphraseFormProps {
  onVerified: () => void;
}

export function PassphraseForm({ onVerified }: PassphraseFormProps) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/verify-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });

      const data = await res.json();

      if (data.valid) {
        onVerified();
      } else {
        setError('Wrong passphrase. Look closer at the stairwell 👀');
        setPassphrase('');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <label htmlFor="passphrase" className="text-sm text-gray-400">
        Enter the secret phrase from the stairwell
      </label>
      <input
        id="passphrase"
        type="text"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="Type the phrase..."
        autoComplete="off"
        className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
      />
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={!passphrase.trim() || isVerifying}
        className="rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerifying ? 'Checking...' : 'Verify'}
      </button>
    </form>
  );
}
