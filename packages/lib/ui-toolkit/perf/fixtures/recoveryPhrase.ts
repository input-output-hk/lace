/**
 * Deterministic 24-word phrase for the ui-toolkit RecoveryPhrase render
 * benchmark. RecoveryPhrase consumes byte arrays (one per word) and decodes
 * them itself, so the fixture encodes fixed BIP39 english words — never a
 * generated mnemonic. No Date.now()/Math.random().
 */
const WORDS = [
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
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
];

export const makeRecoveryPhraseWords = (): Uint8Array[] =>
  WORDS.map(word =>
    Uint8Array.from(Array.from(word, character => character.charCodeAt(0))),
  );
