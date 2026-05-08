import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../lib/locations';
import { mintButtonLabel } from '../MintButton';

describe('mintButtonLabel', () => {
  it('returns "Mint <passName>" for SF in idle state', () => {
    expect(mintButtonLabel(LOCATIONS.sf, false, false)).toBe(
      'Mint San Francisco Welcome Pass',
    );
  });

  it('returns "Mint <passName>" for NYC in idle state', () => {
    expect(mintButtonLabel(LOCATIONS.nyc, false, false)).toBe(
      'Mint Manhattan Hub Pass',
    );
  });

  it('shows wallet-confirm copy when pending, regardless of location', () => {
    expect(mintButtonLabel(LOCATIONS.sf, true, false)).toBe(
      'Confirm in Wallet...',
    );
    expect(mintButtonLabel(LOCATIONS.nyc, true, false)).toBe(
      'Confirm in Wallet...',
    );
  });

  it('shows minting copy when confirming, regardless of location', () => {
    expect(mintButtonLabel(LOCATIONS.sf, false, true)).toBe('Minting...');
    expect(mintButtonLabel(LOCATIONS.nyc, false, true)).toBe('Minting...');
  });

  it('prefers pending over confirming when both are true', () => {
    expect(mintButtonLabel(LOCATIONS.sf, true, true)).toBe(
      'Confirm in Wallet...',
    );
  });

  it('label updates if registry passName changes (no hardcoding)', () => {
    const fakeLocation = {
      ...LOCATIONS.sf,
      passName: 'Test Pass Alpha',
    };
    expect(mintButtonLabel(fakeLocation, false, false)).toBe(
      'Mint Test Pass Alpha',
    );
  });
});
