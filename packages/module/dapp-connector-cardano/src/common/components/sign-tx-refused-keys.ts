import type { SignTxRefusal } from '../store/sign-tx-refusal';

/**
 * The i18n keys the REFUSED sign-tx state renders, in a React-free module so
 * every render mode and the copy tests read the same names -- a key typed
 * twice is a key that can drift once. `title` goes to each mode's own title
 * slot, exactly as the existing `error-title` does.
 */
export const SIGN_TX_REFUSED_KEYS = {
  title: 'dapp-connector.cardano.sign-tx.refused.title',
  reassurance: 'dapp-connector.cardano.sign-tx.refused.reassurance',
  description: {
    'foreign-collateral-return':
      'dapp-connector.cardano.sign-tx.refused.description-foreign-return',
    'network-unstated':
      'dapp-connector.cardano.sign-tx-refused.description-network-unstated',
    'network-mainnet':
      'dapp-connector.cardano.sign-tx-refused.description-network-mainnet',
    'network-testnet':
      'dapp-connector.cardano.sign-tx-refused.description-network-testnet',
    'network-unreadable':
      'dapp-connector.cardano.sign-tx-refused.description-network-unreadable',
  },
  /**
   * The label above the requesting origin: the EXISTING key `SignTxContent`
   * already uses for the same field, so the refused state adds no new
   * translation debt.
   */
  originLabel: 'dapp-connector.cardano.sign-tx.origin-label',
} as const;

/**
 * Everything the refused state needs, kept in ONE prop so a render mode
 * cannot show the refusal without also naming the site that asked for it --
 * the compiler enforces the pairing.
 */
export type SignTxRefusalDetails = SignTxRefusal & {
  /** The requesting dApp's origin, as held by the pending-request slot. */
  dappOrigin: string;
};

/**
 * Which sentence a NETWORK verdict gets.
 *
 * A key per stated network rather than interpolating the word: the rule reads
 * one bit (mainnet or not), and substituting an English "mainnet"/"a testnet"
 * into a translated sentence would leave a hard-coded word inside every
 * locale. The wallet's own network IS interpolated -- that is a network's
 * name, not a phrase.
 */
export const networkRefusalDescriptionKey = (
  refusal: Extract<SignTxRefusal, { kind: 'network' }>,
) => {
  switch (refusal.cause) {
    case 'states-no-network':
      return SIGN_TX_REFUSED_KEYS.description['network-unstated'];
    case 'states-other-network':
      switch (refusal.statedNetwork) {
        case 'mainnet':
          return SIGN_TX_REFUSED_KEYS.description['network-mainnet'];
        case 'testnet':
          return SIGN_TX_REFUSED_KEYS.description['network-testnet'];
        // Unreachable: the producer derives the cause and the label from
        // the same body, and `'states-other-network'` holds under exactly
        // the predicate that makes the label non-null. Only a drift bug
        // reaches here, so it answers with the sentence that stays TRUE
        // under one -- claiming the body names no network would be false of
        // the very bodies that produce this cause.
        case null:
          return SIGN_TX_REFUSED_KEYS.description['network-unreadable'];
      }
    case 'states-unreadable-element':
      return SIGN_TX_REFUSED_KEYS.description['network-unreadable'];
  }
};

/**
 * The dismiss label on the refused screen. Deliberately an EXISTING key of
 * this surface (`SignTxResult`'s close button) -- the refused state adds no
 * new label copy, and inherits its es/ja translations.
 */
export const SIGN_TX_REFUSED_DISMISS_KEY =
  'dapp-connector.cardano.sign-tx.result.close' as const;
