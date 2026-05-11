import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AddressLabel } from '../AddressLabel';

const ADDR = '0x849151d7D0bF1F34b70d5caD5149D28CC2308bf1' as const;

describe('AddressLabel', () => {
  it('renders the basename when present', () => {
    render(<AddressLabel address={ADDR} basename="jesse.base.eth" />);
    expect(screen.getByText('jesse.base.eth')).toBeInTheDocument();
    expect(screen.queryByText(/0x849151/)).not.toBeInTheDocument();
  });

  it('falls back to truncated address when basename is null', () => {
    render(<AddressLabel address={ADDR} basename={null} />);
    expect(screen.getByText('0x8491…8bf1')).toBeInTheDocument();
  });

  it('falls back to truncated address when basename is undefined', () => {
    render(<AddressLabel address={ADDR} basename={undefined} />);
    expect(screen.getByText('0x8491…8bf1')).toBeInTheDocument();
  });

  it('puts the full address in a tooltip in both cases', () => {
    const { rerender } = render(
      <AddressLabel address={ADDR} basename="jesse.base.eth" />,
    );
    expect(screen.getByText('jesse.base.eth')).toHaveAttribute('title', ADDR);

    rerender(<AddressLabel address={ADDR} basename={null} />);
    expect(screen.getByText('0x8491…8bf1')).toHaveAttribute('title', ADDR);
  });
});
