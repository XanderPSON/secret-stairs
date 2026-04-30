import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassphraseForm } from '../PassphraseForm';

const SECRET = [
  'apple', 'banana', 'cherry', 'date',
  'elder', 'fig', 'grape', 'honey',
  'ivy', 'jade', 'kiwi', 'lemon',
];

function mockVerifyApi() {
  vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
    const body = JSON.parse((init?.body as string) ?? '{}');
    const valid = body.word?.trim().toLowerCase() === SECRET[body.index];
    return new Response(JSON.stringify({ valid }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

describe('PassphraseForm — validation timing', () => {
  beforeEach(() => {
    mockVerifyApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function flushDebounce() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
  }

  it('silently locks a correct word after the debounce fires (no red)', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'apple' } });
    await flushDebounce();
    expect(input).toBeDisabled();
    expect(input).not.toHaveClass('border-red-500');
  });

  it('does NOT shake, NOT turn red, NOT clear on a wrong word while still typing', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'wrongword' } });
    await flushDebounce();
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('wrongword');
    expect(input).not.toHaveClass('border-red-500');
    expect(input.closest('div')).not.toHaveClass('animate-shake');
  });

  it('shakes, turns red, but KEEPS the word on Enter when wrong', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'wrongword' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(input).toHaveValue('wrongword');
    expect(input).toHaveClass('border-red-500');
  });

  it('shakes, turns red, but KEEPS the word on Space when wrong', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'wrongword' } });
    fireEvent.keyDown(input, { key: ' ' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(input).toHaveValue('wrongword');
    expect(input).toHaveClass('border-red-500');
  });

  it('shakes, turns red, but KEEPS the word on blur when wrong', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'wrongword' } });
    fireEvent.blur(input);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(input).toHaveValue('wrongword');
    expect(input).toHaveClass('border-red-500');
  });

  it('clears the red state when the user starts editing again', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'wrongword' } });
    fireEvent.blur(input);
    // Advance past the 400ms shake animation so only the persistent
    // 'invalid' state is keeping the red border on.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(input).toHaveClass('border-red-500');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'wrongwor' } });
    });
    expect(input).not.toHaveClass('border-red-500');
  });

  it('locks correctly on explicit submit with the right word', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'apple' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(input).toBeDisabled();
    expect(input).not.toHaveClass('border-red-500');
  });

  it('does not auto-check until the input is at least 3 chars long', async () => {
    render(<PassphraseForm onVerified={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'ap' } });
    await flushDebounce();
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'app' } });
    await flushDebounce();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('on touch devices, blur with a wrong word is silent (no shake/red)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      render(<PassphraseForm onVerified={() => {}} />);
      const input = screen.getAllByRole('textbox')[0];
      fireEvent.change(input, { target: { value: 'wrongword' } });
      fireEvent.blur(input);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(input).toHaveValue('wrongword');
      expect(input).not.toHaveClass('border-red-500');
    } finally {
      window.matchMedia = original;
    }
  });

  it('on touch devices, blur with the correct word still locks', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      render(<PassphraseForm onVerified={() => {}} />);
      const input = screen.getAllByRole('textbox')[0];
      fireEvent.change(input, { target: { value: 'apple' } });
      fireEvent.blur(input);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(input).toBeDisabled();
    } finally {
      window.matchMedia = original;
    }
  });
});
