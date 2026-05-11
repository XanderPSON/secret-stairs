import { describe, expect, it } from 'vitest';
import { generateMetadata } from '../page';

describe('generateMetadata for /[location]', () => {
  it('produces a city-specific title for sf', () => {
    const m = generateMetadata({ params: { location: 'sf' } });
    expect(m.title).toBe('San Francisco');
    expect(m.description).toMatch(/San Francisco/);
    expect(m.description).toMatch(/San Francisco Welcome Pass/);
  });

  it('produces a city-specific title for nyc', () => {
    const m = generateMetadata({ params: { location: 'nyc' } });
    expect(m.title).toBe('New York City');
    expect(m.description).toMatch(/New York City/);
    expect(m.description).toMatch(/Manhattan Hub Pass/);
  });

  it('returns a generic "Not found" title for unknown slugs', () => {
    const m = generateMetadata({ params: { location: 'lon' } });
    expect(m.title).toBe('Not found');
  });

  it('emits Open Graph title that includes the city', () => {
    const sf = generateMetadata({ params: { location: 'sf' } });
    expect(sf.openGraph?.title).toMatch(/San Francisco/);
    const nyc = generateMetadata({ params: { location: 'nyc' } });
    expect(nyc.openGraph?.title).toMatch(/New York City/);
  });

  it('does not leak the literal slug into title or description for unknown slugs', () => {
    const m = generateMetadata({ params: { location: 'lon' } });
    const blob = JSON.stringify(m);
    expect(blob).not.toMatch(/lon/);
  });
});
