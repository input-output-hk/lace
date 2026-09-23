import { collateralRefusalMessage } from '@lace-contract/cardano-context';
import { rawTranslations } from '@lace-contract/i18n';
import { describe, expect, it } from 'vitest';

import { SIGN_TX_REFUSED_KEYS } from '../src/common/components/sign-tx-refused-keys';

import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';

/**
 * Two surfaces carry this refusal, and they are deliberately NOT the same
 * string: the dApp gets an untranslated CIP-30 sentence, the user gets
 * localized screen copy split across a title and a description. Each is
 * pinned against its own literal here; neither is derived from the other.
 */

/** The dApp-facing copy, pinned verbatim. It must not depend on a locale. */
const CIP30_MESSAGE: Record<CollateralOwnershipErrorCase, string> = {
  'foreign-collateral-return':
    "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.",
};

/** The screen copy, pinned verbatim. */
const SCREEN_EN = {
  title: "Lace won't sign this transaction",
  reassurance: 'Nothing has left your wallet.',
  description: {
    'foreign-collateral-return':
      "If the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own.",
  },
} as const;

const CASES: CollateralOwnershipErrorCase[] = ['foreign-collateral-return'];

const LOCALES = ['en', 'es', 'ja'] as const;

const allKeys = [
  SIGN_TX_REFUSED_KEYS.title,
  SIGN_TX_REFUSED_KEYS.reassurance,
  ...CASES.map(c => SIGN_TX_REFUSED_KEYS.description[c]),
];

const locale = (lang: (typeof LOCALES)[number]): Record<string, string> =>
  rawTranslations[lang] as unknown as Record<string, string>;

describe('the refusal copy is pinned on both surfaces', () => {
  it.each(CASES)('%s: the CIP-30 message is byte-unchanged', errorCase => {
    expect(collateralRefusalMessage(errorCase)).toBe(CIP30_MESSAGE[errorCase]);
  });

  it.each(CASES)(
    '%s: the en screen description is byte-unchanged',
    errorCase => {
      expect(locale('en')[SIGN_TX_REFUSED_KEYS.description[errorCase]]).toBe(
        SCREEN_EN.description[errorCase],
      );
    },
  );

  it('the en title and reassurance are byte-unchanged', () => {
    const en = locale('en');
    expect(en[SIGN_TX_REFUSED_KEYS.title]).toBe(SCREEN_EN.title);
    expect(en[SIGN_TX_REFUSED_KEYS.reassurance]).toBe(SCREEN_EN.reassurance);
  });
});

describe('the refusal keys ship in every locale', () => {
  it.each(allKeys)('%s exists in every shipped locale', key => {
    for (const lang of LOCALES) {
      expect(locale(lang)[key]).toBeTypeOf('string');
      expect(locale(lang)[key].length).toBeGreaterThan(0);
    }
  });

  it('the dismiss label reuses an EXISTING key rather than inventing one', () => {
    const key = 'dapp-connector.cardano.sign-tx.result.close';
    for (const lang of LOCALES) {
      expect(locale(lang)[key]).toBeTypeOf('string');
    }
  });
});
