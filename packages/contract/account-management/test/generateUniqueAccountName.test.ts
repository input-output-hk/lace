import { describe, it, expect } from 'vitest';

import { generateUniqueAccountName } from '../src/utils/generateUniqueAccountName';

describe('generateUniqueAccountName', () => {
  it('returns "#0" when no existing names', () => {
    expect(generateUniqueAccountName('Cardano', [])).toBe('Cardano #0');
  });

  it('returns "#0" when no conflicting names exist', () => {
    expect(generateUniqueAccountName('Cardano', ['Bitcoin #0'])).toBe(
      'Cardano #0',
    );
  });

  it('skips to "#1" when "#0" already exists', () => {
    expect(generateUniqueAccountName('Cardano', ['Cardano #0'])).toBe(
      'Cardano #1',
    );
  });

  it('skips to "#2" when "#0" and "#1" already exist', () => {
    expect(
      generateUniqueAccountName('Cardano', ['Cardano #0', 'Cardano #1']),
    ).toBe('Cardano #2');
  });

  it('fills gaps in the sequence', () => {
    expect(
      generateUniqueAccountName('Cardano', ['Cardano #0', 'Cardano #2']),
    ).toBe('Cardano #1');
  });

  it('is case-insensitive when checking existing names', () => {
    expect(generateUniqueAccountName('Cardano', ['cardano #0'])).toBe(
      'Cardano #1',
    );
  });

  it('trims existing names before comparing', () => {
    expect(generateUniqueAccountName('Cardano', ['  Cardano #0  '])).toBe(
      'Cardano #1',
    );
  });

  it('works with different blockchain names', () => {
    expect(generateUniqueAccountName('Bitcoin', ['Cardano #0'])).toBe(
      'Bitcoin #0',
    );
  });

  it('handles many existing names', () => {
    const existing = Array.from(
      { length: 10 },
      (_, index) => `Cardano #${index}`,
    );
    expect(generateUniqueAccountName('Cardano', existing)).toBe('Cardano #10');
  });

  it('always finds a free suffix even when #0..#N-1 are all taken', () => {
    const existing = Array.from(
      { length: 1000 },
      (_, index) => `Cardano #${index}`,
    );
    expect(generateUniqueAccountName('Cardano', existing)).toBe(
      'Cardano #1000',
    );
  });
});
