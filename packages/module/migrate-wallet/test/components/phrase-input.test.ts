import { describe, expect, it } from 'vitest';

import {
  findUnknownWordPositions,
  hasValidWordCount,
  isBip39Word,
  isValidPhrase,
  normalizePhraseInput,
  splitPhraseInput,
} from '../../src/components/phrase-input';

// Verified against util.validateMnemonic, not assumed.
const VALID_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VALID_15 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon address';
const VALID_24 =
  'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote';

const ALL_VALID = [VALID_12, VALID_15, VALID_24];

/** Invisible, non-`\s` characters that routinely survive a paste. */
const INVISIBLE = {
  'soft hyphen': '\u00AD',
  'Mongolian vowel separator': '\u180E',
  'zero-width space': '\u200B',
  'zero-width non-joiner': '\u200C',
  'zero-width joiner': '\u200D',
  'word joiner': '\u2060',
};

describe('normalizePhraseInput', () => {
  it('trims, collapses whitespace runs and lowercases', () => {
    expect(normalizePhraseInput('  Abandon\t\tABOUT \n zoo  ')).toBe(
      'abandon about zoo',
    );
  });

  it('treats non-breaking and ideographic spaces as separators', () => {
    expect(normalizePhraseInput('abandon\u00A0about\u3000zoo')).toBe(
      'abandon about zoo',
    );
  });

  it('is idempotent', () => {
    const once = normalizePhraseInput('  Abandon\u00A0 ABOUT  ');
    expect(normalizePhraseInput(once)).toBe(once);
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizePhraseInput('   \n\t  ')).toBe('');
  });

  // U+FEFF *is* matched by `\s`, so it already acts as a separator. Stripping
  // it before the split would glue its neighbours into one bogus word.
  it('keeps U+FEFF working as a separator rather than stripping it', () => {
    expect(normalizePhraseInput('abandon\uFEFFabout')).toBe('abandon about');
  });

  // MW-013. bip39 normalises NFKD before its lookup, so a fullwidth phrase
  // validates while WalletId hashes the raw codepoints — the already-loaded
  // refusal then silently stops matching.
  it('folds NFKD-compatibility lookalikes onto their ASCII form', () => {
    expect(
      normalizePhraseInput('\uFF5A\uFF4F\uFF4F \uFF56\uFF4F\uFF54\uFF45'),
    ).toBe('zoo vote');
  });

  it('leaves an already-ASCII phrase untouched by the NFKD pass', () => {
    expect(normalizePhraseInput(VALID_24)).toBe(VALID_24);
  });

  describe.each(Object.entries(INVISIBLE))('%s', (_name, character) => {
    it('is stripped from inside a word', () => {
      expect(normalizePhraseInput(`aban${character}don about`)).toBe(
        'abandon about',
      );
    });

    it('is stripped when it flanks a word', () => {
      expect(
        normalizePhraseInput(`${character}abandon${character} about`),
      ).toBe('abandon about');
    });

    // The property that makes stripping permissible: none is `\s`, so removing
    // one can never merge words or break a phrase that already validated.
    it('never merges two words that were already separated', () => {
      expect(normalizePhraseInput(`abandon ${character} about`)).toBe(
        'abandon about',
      );
    });
  });
});

describe('splitPhraseInput', () => {
  it('yields no words for empty or whitespace-only input', () => {
    expect(splitPhraseInput('')).toEqual([]);
    expect(splitPhraseInput('   ')).toEqual([]);
  });

  it('yields normalised words in order', () => {
    expect(splitPhraseInput('  Zoo   VOTE ')).toEqual(['zoo', 'vote']);
  });

  it.each(ALL_VALID)('preserves the word count of a valid phrase', phrase => {
    expect(splitPhraseInput(phrase)).toHaveLength(phrase.split(' ').length);
  });
});

describe('isBip39Word', () => {
  it('accepts wordlist entries', () => {
    expect(isBip39Word('abandon')).toBe(true);
    expect(isBip39Word('zoo')).toBe(true);
  });

  it('rejects near-misses and non-words', () => {
    expect(isBip39Word('abandonn')).toBe(false);
    expect(isBip39Word('')).toBe(false);
  });

  // A plain-object lookup table would report these as members via the
  // prototype chain, silently accepting a bogus word.
  it('rejects Object.prototype keys', () => {
    expect(isBip39Word('constructor')).toBe(false);
    expect(isBip39Word('__proto__')).toBe(false);
    expect(isBip39Word('toString')).toBe(false);
  });
});

describe('findUnknownWordPositions', () => {
  it('reports nothing for an all-wordlist phrase', () => {
    expect(findUnknownWordPositions(splitPhraseInput(VALID_24))).toEqual([]);
  });

  it('reports 1-based positions of typos', () => {
    const words = splitPhraseInput('abandon abandno about xyzzy');
    expect(findUnknownWordPositions(words)).toEqual([2, 4]);
  });

  it('reports every typo, not just the first', () => {
    const words = splitPhraseInput('aaa bbb ccc');
    expect(findUnknownWordPositions(words)).toEqual([1, 2, 3]);
  });
});

describe('hasValidWordCount', () => {
  it.each([12, 15, 24])('accepts %i words', count => {
    expect(hasValidWordCount(Array.from({ length: count }, () => 'zoo'))).toBe(
      true,
    );
  });

  it.each([0, 11, 13, 16, 23, 25])('rejects %i words', count => {
    expect(hasValidWordCount(Array.from({ length: count }, () => 'zoo'))).toBe(
      false,
    );
  });
});

describe('isValidPhrase', () => {
  it.each(ALL_VALID)('accepts a checksum-valid phrase', phrase => {
    expect(isValidPhrase(splitPhraseInput(phrase))).toBe(true);
  });

  it('rejects an accepted-length phrase with a bad checksum', () => {
    const words = splitPhraseInput(VALID_24);
    expect(isValidPhrase([...words.slice(0, 23), 'zoo'])).toBe(false);
  });

  it('rejects a wordlist-valid phrase of the wrong length', () => {
    expect(isValidPhrase(splitPhraseInput('abandon about zoo'))).toBe(false);
  });

  // The end-to-end property the helper exists for: a phrase pasted with
  // invisible junk must validate instead of being generically rejected.
  it.each(Object.entries(INVISIBLE))(
    'accepts a valid phrase polluted with a %s',
    (_name, character) => {
      const polluted = VALID_24.split(' ')
        .map((word, index) => (index % 3 === 0 ? `${word}${character}` : word))
        .join(' ');

      expect(isValidPhrase(splitPhraseInput(polluted))).toBe(true);
    },
  );

  it.each(ALL_VALID)(
    'still accepts a valid phrase after mixed-case and padding damage',
    phrase => {
      const damaged = `\n  ${phrase
        .toUpperCase()
        .replace(/ /g, '\u00A0\u00A0')}  \t`;
      expect(isValidPhrase(splitPhraseInput(damaged))).toBe(true);
    },
  );

  // The words handed downstream must be byte-identical to the canonical form,
  // not merely "valid" — WalletId hashes them verbatim.
  it('yields the canonical words for a fullwidth-Latin phrase', () => {
    const fullwidth = VALID_24.replaceAll('zoo', '\uFF5A\uFF4F\uFF4F');

    expect(splitPhraseInput(fullwidth)).toEqual(splitPhraseInput(VALID_24));
    expect(isValidPhrase(splitPhraseInput(fullwidth))).toBe(true);
  });
});
