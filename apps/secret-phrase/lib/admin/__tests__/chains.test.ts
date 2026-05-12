import { describe, expect, it } from 'vitest';
import {
  ADMIN_CHAINS,
  DEFAULT_CHAIN_SLUG,
  getChain,
} from '../chains';

describe('chains registry', () => {
  it('exposes base-sepolia and base entries', () => {
    expect(ADMIN_CHAINS['base-sepolia']).toBeDefined();
    expect(ADMIN_CHAINS.base).toBeDefined();
  });

  it('base-sepolia has a contract address', () => {
    expect(ADMIN_CHAINS['base-sepolia'].contractAddress).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    );
  });

  it('base mainnet contractAddress is null until deployed', () => {
    expect(ADMIN_CHAINS.base.contractAddress).toBeNull();
  });

  it('default chain slug resolves', () => {
    expect(() => getChain(DEFAULT_CHAIN_SLUG)).not.toThrow();
  });

  it('throws on unknown slug', () => {
    expect(() => getChain('mars')).toThrow(/unknown chain/i);
  });

  it('explorer URLs are well-formed', () => {
    const c = getChain('base-sepolia');
    expect(c.explorerTxUrl('0xabc')).toContain('sepolia.basescan.org/tx/0xabc');
    expect(c.explorerAddressUrl('0xdef')).toContain(
      'sepolia.basescan.org/address/0xdef',
    );
  });
});
