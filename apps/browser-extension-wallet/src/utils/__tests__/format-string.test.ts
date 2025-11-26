/* eslint-disable no-magic-numbers */
import { shortenString, sanitizeForPostHog } from '../format-string';

describe('format-string', () => {
  describe('shortenString', () => {
    test('shortens a string to the new desired length and adds "..." at the end', () => {
      expect(shortenString('This is a long string', 7)).toEqual('This is...');
    });

    test('returns the same string if the new length is equal to the string length', () => {
      expect(shortenString('This string is 33 characters long', 33)).toEqual('This string is 33 characters long');
    });

    test('returns the same string if the string is shorter that the new length', () => {
      expect(shortenString('7 chars', 8)).toEqual('7 chars');
    });

    test('ignores negative values or zero as the new length', () => {
      expect(shortenString('Still the same', -5)).toEqual('Still the same');
      expect(shortenString('Also the same', 0)).toEqual('Also the same');
    });
  });

  describe('sanitizeForPostHog', () => {
    test('converts to lowercase and replaces spaces with hyphens', () => {
      expect(sanitizeForPostHog('Hello World')).toEqual('hello-world');
    });

    test('handles multiple spaces and underscores', () => {
      expect(sanitizeForPostHog('Hello   World_Test')).toEqual('hello-world-test');
    });

    test('preserves special characters', () => {
      expect(sanitizeForPostHog('Alert! @#$%^&*()')).toEqual('alert!-@#$%^&*()');
    });

    test('removes control characters but preserves printable special chars', () => {
      expect(sanitizeForPostHog('Test\u0000\u001F\u007FString')).toEqual('teststring');
      expect(sanitizeForPostHog('Test!@#String')).toEqual('test!@#string');
    });

    test('handles unicode characters by normalizing them', () => {
      expect(sanitizeForPostHog('Café')).toEqual('cafe');
      expect(sanitizeForPostHog('Niño')).toEqual('nino');
      expect(sanitizeForPostHog('Müller')).toEqual('muller');
    });

    test('removes multiple consecutive hyphens', () => {
      expect(sanitizeForPostHog('Hello---World')).toEqual('hello-world');
      expect(sanitizeForPostHog('Test----String')).toEqual('test-string');
    });

    test('removes leading and trailing hyphens', () => {
      expect(sanitizeForPostHog('-Hello World-')).toEqual('hello-world');
      expect(sanitizeForPostHog('---Test---')).toEqual('test');
    });

    test('limits string length to maxLength', () => {
      const longString = 'a'.repeat(150);
      const result = sanitizeForPostHog(longString, 100);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).not.toMatch(/-$/);
    });

    test('removes trailing hyphen after truncation', () => {
      const stringWithHyphen = 'a-'.repeat(60);
      const result = sanitizeForPostHog(stringWithHyphen, 100);
      expect(result).not.toMatch(/-$/);
    });

    test('handles empty string', () => {
      expect(sanitizeForPostHog('')).toEqual('');
    });

    test('handles null and undefined', () => {
      // eslint-disable-next-line unicorn/no-null
      expect(sanitizeForPostHog(null as unknown as string)).toEqual('');
      expect(sanitizeForPostHog(undefined as unknown as string)).toEqual('');
    });

    test('handles strings with only special characters', () => {
      expect(sanitizeForPostHog('!@#$%^&*()')).toEqual('!@#$%^&*()');
    });

    test('handles strings with only spaces', () => {
      expect(sanitizeForPostHog('   ')).toEqual('');
    });

    test('handles mixed case with special characters', () => {
      expect(sanitizeForPostHog('Hello World! Test@123')).toEqual('hello-world!-test@123');
    });

    test('uses default maxLength of 100', () => {
      const longString = 'a'.repeat(150);
      const result = sanitizeForPostHog(longString);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    test('respects custom maxLength', () => {
      const longString = 'a'.repeat(150);
      const result = sanitizeForPostHog(longString, 50);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('handles real-world notification titles', () => {
      expect(sanitizeForPostHog('New Transaction Received')).toEqual('new-transaction-received');
      expect(sanitizeForPostHog('Staking Reward: +100 ADA')).toEqual('staking-reward:-+100-ada');
      expect(sanitizeForPostHog('Important Alert!')).toEqual('important-alert!');
    });
  });
});
