import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';

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
export type SignTxRefusalDetails = {
  case: CollateralOwnershipErrorCase;
  /** The requesting dApp's origin, as held by the pending-request slot. */
  dappOrigin: string;
};

/**
 * The dismiss label on the refused screen. Deliberately an EXISTING key of
 * this surface (`SignTxResult`'s close button) -- the refused state adds no
 * new label copy, and inherits its es/ja translations.
 */
export const SIGN_TX_REFUSED_DISMISS_KEY =
  'dapp-connector.cardano.sign-tx.result.close' as const;
