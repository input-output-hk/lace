import { util } from '@cardano-sdk/key-management';
import { wordlists } from 'bip39';

/** Mnemonic lengths Lace accepts, matching the platform's `MnemonicNextButton`. */
export const VALID_WORD_COUNTS: readonly number[] = [12, 15, 24];

/**
 * Invisible characters JS `\s` misses, so they stay glued to a word and the
 * phrase fails validation with no explanation. Routine in pastes from PDFs and
 * password managers. Stripping is monotonic: none is `\s` (so none is a
 * separator) and BIP39 English is `[a-z]+` (so none is part of a real word).
 * U+FEFF is excluded — `\s` matches it, so stripping would merge its neighbours.
 */
const INVISIBLE_NON_SPACE = /[\u00AD\u180E\u200B-\u200D\u2060]/g;

/**
 * NFKD, strip invisibles, trim, collapse whitespace, lowercase. NFKD is
 * load-bearing: `bip39` normalises internally, so a fullwidth-Latin phrase
 * validates while the raw codepoints reach `WalletId.deriveFromMnemonic`,
 * which hashes them verbatim — the same seed then yields a different id and
 * `matchLoadedWallet` stops recognising an already-loaded wallet.
 */
export const normalizePhraseInput = (raw: string): string =>
  raw
    .normalize('NFKD')
    .replace(INVISIBLE_NON_SPACE, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

/** Normalised words, in order. Empty input yields an empty list, not `['']`. */
export const splitPhraseInput = (raw: string): string[] => {
  const normalized = normalizePhraseInput(raw);
  return normalized === '' ? [] : normalized.split(' ');
};

// `bip39` is already bundled via `util.validateMnemonic`, so the wordlist is
// free. A `Set`, not a `Record`: 2048 entries built at runtime, and it avoids
// prototype keys (`__proto__`, `constructor`) matching attacker-supplied text.
const englishWords = new Set<string>(wordlists.english);

/** Whether a normalised word appears in the BIP39 English wordlist. */
export const isBip39Word = (word: string): boolean => englishWords.has(word);

/**
 * 1-based positions of words absent from the BIP39 wordlist — the typos. Safe
 * on any screen including verification: the wordlist is public, so this is a
 * pure function of the user's own input and leaks nothing about a target phrase.
 */
export const findUnknownWordPositions = (words: readonly string[]): number[] =>
  words.reduce<number[]>((positions, word, index) => {
    if (!isBip39Word(word)) positions.push(index + 1);
    return positions;
  }, []);

/** Whether the count is one Lace accepts. Says nothing about the checksum. */
export const hasValidWordCount = (words: readonly string[]): boolean =>
  VALID_WORD_COUNTS.includes(words.length);

/** Full BIP39 validation: accepted length and a correct checksum. */
export const isValidPhrase = (words: readonly string[]): boolean =>
  hasValidWordCount(words) && util.validateMnemonic(words.join(' '));
