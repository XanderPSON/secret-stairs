'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PassphraseFormProps {
  onVerified: () => void;
}

const WORD_COUNT = 12;

export function PassphraseForm({ onVerified }: PassphraseFormProps) {
  const [words, setWords] = useState<string[]>(Array(WORD_COUNT).fill(''));
  const [locked, setLocked] = useState<boolean[]>(Array(WORD_COUNT).fill(false));
  const [shaking, setShaking] = useState<number | null>(null);
  const [invalid, setInvalid] = useState<boolean[]>(Array(WORD_COUNT).fill(false));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const debounceTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(WORD_COUNT).fill(null),
  );

  useEffect(() => {
    inputRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const t of timers) {
        if (t) {
          clearTimeout(t);
        }
      }
    };
  }, []);

  const verifyWord = useCallback(async (word: string, index: number) => {
    try {
      const res = await fetch('/api/verify-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, index }),
      });
      const data = await res.json();
      return data.valid;
    } catch {
      return false;
    }
  }, []);

  const lockAndAdvance = useCallback((index: number) => {
    setInvalid((prev) => {
      if (!prev[index]) {
        return prev;
      }
      const next = [...prev];
      next[index] = false;
      return next;
    });
    setLocked((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    const nextEmpty = locked.findIndex((l, i) => !l && i > index);
    const nextIndex =
      nextEmpty >= 0
        ? nextEmpty
        : locked.findIndex((l, i) => !l && i !== index);

    if (nextIndex >= 0) {
      setActiveIndex(nextIndex);
    }

    const allLocked = locked.every((l, i) => l || i === index);
    if (allLocked) {
      setTimeout(onVerified, 600);
    }
  }, [locked, onVerified]);

  // Silent auto-check while the user is still typing: lock if correct,
  // do absolutely nothing if wrong (no shake, no clear, no red).
  const tryAutoLock = useCallback(async (index: number) => {
    const word = wordsRef.current[index].trim();
    if (!word) {
      return;
    }
    const valid = await verifyWord(word, index);
    if (valid && !locked[index]) {
      lockAndAdvance(index);
    }
  }, [verifyWord, locked, lockAndAdvance]);

  // Explicit submit: user pressed Space/Enter/Tab or blurred the field. Show
  // shake + red on failure but keep the typed word intact so they can fix it.
  const submitWord = useCallback(async (index: number) => {
    const word = wordsRef.current[index].trim();
    if (!word || locked[index]) {
      return;
    }
    const valid = await verifyWord(word, index);
    if (valid) {
      lockAndAdvance(index);
      return;
    }
    setInvalid((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setShaking(index);
    setTimeout(() => setShaking(null), 400);
  }, [verifyWord, locked, lockAndAdvance]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      submitWord(index);
      return;
    }

    if (e.key === 'Backspace' && words[index] === '' && index > 0) {
      e.preventDefault();
      let prevUnlocked = index - 1;
      while (prevUnlocked >= 0 && locked[prevUnlocked]) {
        prevUnlocked--;
      }
      if (prevUnlocked >= 0) {
        setActiveIndex(prevUnlocked);
      }
    }
    // Tab is intentionally NOT handled — let the browser move focus naturally,
    // which fires onBlur and routes through the same submitWord path.
  }, [words, locked, submitWord]);

  const handleBlur = useCallback((index: number) => {
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
      debounceTimers.current[index] = null;
    }
    // On touch devices, blur fires for many non-intentional reasons (scroll,
    // suggestion bar tap, keyboard dismissal). Treat blur as a silent
    // auto-check there \u2014 lock if correct, do nothing if wrong. On desktop,
    // blur is an explicit "I'm done" signal so use the noisy submitWord path.
    const isTouch =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      tryAutoLock(index);
    } else {
      submitWord(index);
    }
  }, [submitWord, tryAutoLock]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent, index: number) => {
    const pasted = e.clipboardData.getData('text').trim();
    const pastedWords = pasted.split(/\s+/).filter(Boolean);

    if (pastedWords.length <= 1) return;

    e.preventDefault();

    const newWords = [...words];
    const newLocked = [...locked];
    const newInvalid = [...invalid];
    let slot = index;

    for (const pw of pastedWords) {
      while (slot < WORD_COUNT && newLocked[slot]) slot++;
      if (slot >= WORD_COUNT) break;
      newWords[slot] = pw;
      newInvalid[slot] = false;
      slot++;
    }

    setWords(newWords);
    setInvalid(newInvalid);

    const wrongIndices: number[] = [];

    for (let i = index; i < WORD_COUNT; i++) {
      if (newLocked[i] || !newWords[i]) {
        continue;
      }
      const valid = await verifyWord(newWords[i], i);
      if (valid) {
        newLocked[i] = true;
        setLocked([...newLocked]);
      } else {
        wrongIndices.push(i);
      }
    }

    if (wrongIndices.length > 0) {
      setInvalid((prev) => {
        const next = [...prev];
        for (const i of wrongIndices) {
          next[i] = true;
        }
        return next;
      });
      setShaking(wrongIndices[0]);
      setTimeout(() => setShaking(null), 400);
    }

    setLocked([...newLocked]);

    if (newLocked.every(Boolean)) {
      setTimeout(onVerified, 600);
      return;
    }

    const nextEmpty = newLocked.findIndex((l) => !l);
    if (nextEmpty >= 0) {
      setActiveIndex(nextEmpty);
    }
  }, [words, locked, invalid, verifyWord, onVerified]);

  const handleChange = (value: string, index: number) => {
    if (locked[index]) {
      return;
    }
    const cleaned = value.replace(/\s/g, '');
    setWords((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
    // Editing clears any prior 'invalid' red state for this slot — the user
    // is fixing the word, so don't keep yelling at them.
    setInvalid((prev) => {
      if (!prev[index]) {
        return prev;
      }
      const next = [...prev];
      next[index] = false;
      return next;
    });

    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    if (cleaned.length >= 3) {
      debounceTimers.current[index] = setTimeout(() => {
        tryAutoLock(index);
      }, 600);
    }
  };

  const lockedCount = locked.filter(Boolean).length;
  const allLocked = lockedCount === WORD_COUNT;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto animate-fade-in-up">
      <p className="text-xs text-gray-500 tracking-wide uppercase">
        {lockedCount} / {WORD_COUNT} words decoded
      </p>

      <div className={`grid grid-cols-4 gap-2 w-full transition-all duration-500 ${allLocked ? 'box-glow-strong rounded-xl' : ''}`}>
        {Array.from({ length: WORD_COUNT }).map((_, i) => (
          <div
            key={`word-${i}`}
            className={`relative ${shaking === i ? 'animate-shake' : ''} ${locked[i] ? 'animate-word-lock' : ''}`}
          >
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={words[i]}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={(e) => handlePaste(e, i)}
              onFocus={() => !locked[i] && setActiveIndex(i)}
              onBlur={() => handleBlur(i)}
              disabled={locked[i]}
              placeholder={String(i + 1)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              data-form-type="other"
              data-1p-ignore="true"
              data-lpignore="true"
              className={`
                w-full h-11 rounded-lg text-center text-sm font-mono
                transition-all duration-300 outline-none
                ${locked[i]
                  ? 'bg-stairs-blue/20 border-stairs-blue text-white border cursor-default'
                  : i === activeIndex
                    ? 'bg-stairs-dim border-stairs-blue/60 text-white border box-glow'
                    : 'bg-stairs-dim border-gray-700/50 text-gray-400 border hover:border-gray-600'
                }
                ${invalid[i] || shaking === i ? 'border-red-500 bg-red-500/10' : ''}
                placeholder:text-gray-600 placeholder:text-xs
                disabled:cursor-default
              `}
            />
            {locked[i] && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-stairs-blue flex items-center justify-center">
                <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                  <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        Type each word to unlock, or paste all 12 at once
      </p>
    </div>
  );
}
