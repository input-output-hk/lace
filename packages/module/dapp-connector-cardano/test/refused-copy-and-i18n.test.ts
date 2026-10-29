import { collateralRefusalMessage } from '@lace-contract/cardano-context';
import { rawTranslations } from '@lace-contract/i18n';
import { describe, expect, it } from 'vitest';

import {
  networkRefusalDescriptionKey,
  SIGN_TX_REFUSED_KEYS,
} from '../src/common/components/sign-tx-refused-keys';

import type { SignTxRefusal } from '../src/common/store/sign-tx-refusal';
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

// Every description key, not just the collateral one: a key reachable from
// `networkRefusalDescriptionKey` but absent from a locale renders as its own
// name on the refusal screen.
const allKeys = [
  SIGN_TX_REFUSED_KEYS.title,
  SIGN_TX_REFUSED_KEYS.reassurance,
  ...Object.values(SIGN_TX_REFUSED_KEYS.description),
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

/**
 * The network sentences, pinned verbatim. `{{walletNetwork}}` is the wallet's
 * own network; the transaction's side is carried by WHICH key is chosen, not
 * by a substituted word -- see `networkRefusalDescriptionKey`.
 */
const NETWORK_EN = {
  'network-unstated':
    "This wallet is on {{walletNetwork}}. This transaction doesn't say which network it's for.",
  'network-mainnet':
    'This wallet is on {{walletNetwork}}. Part of this transaction is meant for mainnet.',
  'network-testnet':
    'This wallet is on {{walletNetwork}}. Part of this transaction is meant for a testnet.',
  'network-unreadable':
    "This wallet is on {{walletNetwork}}. Lace couldn't read this transaction well enough to tell which network it's for.",
} as const;

const networkRefusal = (
  cause: Extract<SignTxRefusal, { kind: 'network' }>['cause'],
  statedNetwork: 'mainnet' | 'testnet' | null = null,
): SignTxRefusal => ({
  kind: 'network',
  cause,
  statedNetwork,
  walletNetwork: 'preprod',
});

describe('the network refusal copy is pinned', () => {
  it.each(Object.entries(NETWORK_EN))(
    '%s is byte-unchanged in en',
    (token, text) => {
      expect(
        locale('en')[
          SIGN_TX_REFUSED_KEYS.description[token as keyof typeof NETWORK_EN]
        ],
      ).toBe(text);
    },
  );

  it.each(Object.keys(NETWORK_EN))(
    '%s interpolates the wallet network in every locale',
    token => {
      for (const lang of LOCALES) {
        expect(
          locale(lang)[
            SIGN_TX_REFUSED_KEYS.description[token as keyof typeof NETWORK_EN]
          ],
        ).toContain('{{walletNetwork}}');
      }
    },
  );
});

describe('each network cause reaches its own sentence', () => {
  it.each([
    ['states-no-network', null, 'network-unstated'],
    ['states-other-network', 'mainnet', 'network-mainnet'],
    ['states-other-network', 'testnet', 'network-testnet'],
    ['states-unreadable-element', null, 'network-unreadable'],
  ] as const)('%s / stated %s -> %s', (cause, statedNetwork, token) => {
    expect(
      networkRefusalDescriptionKey(
        networkRefusal(cause, statedNetwork) as Extract<
          SignTxRefusal,
          { kind: 'network' }
        >,
      ),
    ).toBe(SIGN_TX_REFUSED_KEYS.description[token]);
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
