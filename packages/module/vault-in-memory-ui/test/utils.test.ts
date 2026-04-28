import { ByteArray } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { mnemonicToString, mnemonicToByteArrayWords } from '../src/utils';

describe('mnemonic utils', () => {
  const mockMnemonicWords = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
    'access',
    'accident',
  ];

  const mockMnemonicByteArrays = mockMnemonicWords.map(word =>
    ByteArray.fromUTF8(word),
  );

  const mockMnemonicString = mockMnemonicWords.join(' ');

  const mockMnemonicStringBytaArray = ByteArray.fromUTF8(mockMnemonicString);

  describe('mnemonicToString', () => {
    it('should convert array of ByteArray to space-separated string', () => {
      const result = mnemonicToString(mockMnemonicByteArrays);

      expect(result).toBe(mockMnemonicString);
      expect(result.split(' ')).toHaveLength(12);
    });

    it('should handle empty array', () => {
      const result = mnemonicToString([]);

      expect(result).toBe('');
    });

    it('should handle single word', () => {
      const singleWordByteArray = [ByteArray.fromUTF8('test')];
      const result = mnemonicToString(singleWordByteArray);

      expect(result).toBe('test');
    });

    it('should join words with single spaces', () => {
      const twoWords = ['hello', 'world'];
      const twoWordsByteArrays = twoWords.map(word => ByteArray.fromUTF8(word));
      const result = mnemonicToString(twoWordsByteArrays);

      expect(result).toBe('hello world');
      expect(result).not.toContain('  '); // no double spaces
    });

    it('should handle unicode characters in joined string', () => {
      const unicodeWords = ['café', '日本語'];
      const unicodeByteArrays = unicodeWords.map(word =>
        ByteArray.fromUTF8(word),
      );
      const result = mnemonicToString(unicodeByteArrays);

      expect(result).toBe('café 日本語');
    });
  });

  describe('mnemonicToByteArrayWords', () => {
    it('should convert ByteArray of space-separated string to array of ByteArrays', () => {
      const result = mnemonicToByteArrayWords(mockMnemonicStringBytaArray);

      expect(result).toHaveLength(12);

      // Convert back to strings to compare
      const resultAsStrings = result.map(byteArray =>
        ByteArray.toUTF8(byteArray),
      );
      expect(resultAsStrings).toEqual(mockMnemonicWords);
    });

    it('should handle empty string', () => {
      const result = mnemonicToByteArrayWords(ByteArray.fromUTF8(''));

      expect(result).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = mnemonicToByteArrayWords(ByteArray.fromUTF8('   '));

      expect(result).toEqual([]);
    });

    it('should handle single word', () => {
      const result = mnemonicToByteArrayWords(ByteArray.fromUTF8('test'));

      expect(result).toHaveLength(1);
      expect(ByteArray.toUTF8(result[0])).toBe('test');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = mnemonicToByteArrayWords(
        ByteArray.fromUTF8('  hello world  '),
      );

      expect(result).toHaveLength(2);
      expect(ByteArray.toUTF8(result[0])).toBe('hello');
      expect(ByteArray.toUTF8(result[1])).toBe('world');
    });

    it('should handle multiple spaces between words', () => {
      const result = mnemonicToByteArrayWords(
        ByteArray.fromUTF8('hello    world     test'),
      );

      expect(result).toHaveLength(3);
      expect(ByteArray.toUTF8(result[0])).toBe('hello');
      expect(ByteArray.toUTF8(result[1])).toBe('world');
      expect(ByteArray.toUTF8(result[2])).toBe('test');
    });

    it('should only split on spaces, not tabs or newlines', () => {
      // The secure implementation only splits on space (0x20) characters
      // Recovery phrases are always space-separated in legitimate usage
      const result = mnemonicToByteArrayWords(
        ByteArray.fromUTF8('hello\tworld\ntest'),
      );

      // Should be treated as a single "word" since no spaces
      expect(result).toHaveLength(1);
      expect(ByteArray.toUTF8(result[0])).toBe('hello\tworld\ntest');
    });

    it('should handle unicode characters', () => {
      const result = mnemonicToByteArrayWords(
        ByteArray.fromUTF8('café 日本語'),
      );

      expect(result).toHaveLength(2);
      expect(ByteArray.toUTF8(result[0])).toBe('café');
      expect(ByteArray.toUTF8(result[1])).toBe('日本語');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through mnemonicToString -> mnemonicToByteArrayWords', () => {
      const originalString = mnemonicToString(mockMnemonicByteArrays);
      const convertedBack = mnemonicToByteArrayWords(
        ByteArray.fromUTF8(originalString),
      );
      const finalString = mnemonicToString(convertedBack);

      expect(finalString).toBe(originalString);
    });

    it('should maintain data integrity through mnemonicToByteArrayWords -> mnemonicToString', () => {
      const originalByteArrays = mnemonicToByteArrayWords(
        mockMnemonicStringBytaArray,
      );
      const convertedString = mnemonicToString(originalByteArrays);
      const finalByteArrays = mnemonicToByteArrayWords(
        ByteArray.fromUTF8(convertedString),
      );

      const originalAsStrings = originalByteArrays.map(ba =>
        ByteArray.toUTF8(ba),
      );
      const finalAsStrings = finalByteArrays.map(ba => ByteArray.toUTF8(ba));

      expect(finalAsStrings).toEqual(originalAsStrings);
    });
  });

  describe('security', () => {
    it('should create true copies, not views - returned words remain valid after source is zeroed', () => {
      const mockMnemonic = 'abandon abandon about';

      // CRITICAL: Use Buffer to match runtime behavior (emip3decrypt returns Buffer)
      // Buffer.prototype.slice() creates views (shares memory), unlike Uint8Array.slice()
      const sourceBuffer = Buffer.from(ByteArray.fromUTF8(mockMnemonic));

      const result = mnemonicToByteArrayWords(ByteArray(sourceBuffer));

      // Zero the source buffer (simulating cleanup after decryption)
      sourceBuffer.fill(0);

      // Verify the source buffer was actually zeroed
      expect(sourceBuffer.every(byte => byte === 0)).toBe(true);

      // CRITICAL: Verify the returned words are still valid after zeroing source
      // If slice() was used directly (without new Uint8Array()), these would be zeros!
      expect(result).toHaveLength(3);
      expect(ByteArray.toUTF8(result[0])).toBe('abandon');
      expect(ByteArray.toUTF8(result[1])).toBe('abandon');
      expect(ByteArray.toUTF8(result[2])).toBe('about');
    });

    it('should handle 12-word recovery phrase with Buffer', () => {
      const mockMnemonic = mockMnemonicWords.join(' ');

      // Use Buffer to match emip3decrypt's actual runtime behavior
      const sourceBuffer = Buffer.from(ByteArray.fromUTF8(mockMnemonic));

      const result = mnemonicToByteArrayWords(ByteArray(sourceBuffer));

      expect(result).toHaveLength(12);
      expect(ByteArray.toUTF8(result[0])).toBe('abandon');
      expect(ByteArray.toUTF8(result[11])).toBe('accident');

      // Verify zeroing source doesn't affect words
      sourceBuffer.fill(0);
      expect(ByteArray.toUTF8(result[0])).toBe('abandon');
    });

    it('should handle 24-word recovery phrase with Buffer', () => {
      const words = Array(24).fill('word').join(' ');
      const sourceBuffer = Buffer.from(ByteArray.fromUTF8(words));

      const result = mnemonicToByteArrayWords(ByteArray(sourceBuffer));

      expect(result).toHaveLength(24);
      result.forEach(word => {
        expect(ByteArray.toUTF8(word)).toBe('word');
      });

      // Verify zeroing source doesn't affect words
      sourceBuffer.fill(0);
      result.forEach(word => {
        expect(ByteArray.toUTF8(word)).toBe('word');
      });
    });

    it('should handle recovery phrases with leading/trailing spaces', () => {
      const mockMnemonic = '  abandon abandon about  ';
      const sourceBuffer = Buffer.from(ByteArray.fromUTF8(mockMnemonic));

      const result = mnemonicToByteArrayWords(ByteArray(sourceBuffer));

      // Should filter out empty strings from leading/trailing spaces
      expect(result).toHaveLength(3);
      expect(ByteArray.toUTF8(result[0])).toBe('abandon');
      expect(ByteArray.toUTF8(result[1])).toBe('abandon');
      expect(ByteArray.toUTF8(result[2])).toBe('about');

      // Verify zeroing source doesn't affect words
      sourceBuffer.fill(0);
      expect(ByteArray.toUTF8(result[0])).toBe('abandon');
    });
  });

  describe('edge cases', () => {
    it('should handle very long mnemonic phrase', () => {
      const longMnemonic = Array(100)
        .fill('word')
        .map((word, index) => `${word}${index}`);
      const longByteArrays = longMnemonic.map(word => ByteArray.fromUTF8(word));

      const stringResult = mnemonicToString(longByteArrays);
      const backToByteArrays = mnemonicToByteArrayWords(
        ByteArray.fromUTF8(stringResult),
      );

      expect(stringResult.split(' ')).toHaveLength(100);
      expect(backToByteArrays).toHaveLength(100);
    });

    it('should handle special characters in words', () => {
      const specialWords = [
        'word-with-dash',
        'word_with_underscore',
        'word.with.dot',
      ];
      const specialByteArrays = specialWords.map(word =>
        ByteArray.fromUTF8(word),
      );

      const stringResult = mnemonicToString(specialByteArrays);
      const backToByteArrays = mnemonicToByteArrayWords(
        ByteArray.fromUTF8(stringResult),
      );
      const backToStrings = backToByteArrays.map(ba => ByteArray.toUTF8(ba));

      expect(backToStrings).toEqual(specialWords);
    });
  });
});
