import { useMemo } from 'react';

import {
  SIGN_TX_REFUSED_DISMISS_KEY,
  SIGN_TX_REFUSED_KEYS,
} from './sign-tx-refused-keys';

import type { SignTxRefusalDetails } from './sign-tx-refused-keys';
import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';

/**
 * The block verdict a pending request carries, or `null` for a reviewable one.
 * Memoized on the two primitives, because callers put it in dependency lists.
 */
export const useSignTxRefusal = ({
  collateralRefusal,
  dappOrigin,
}: {
  collateralRefusal?: CollateralOwnershipErrorCase | null;
  dappOrigin?: string;
}): SignTxRefusalDetails | null =>
  useMemo(
    () =>
      collateralRefusal && dappOrigin !== undefined
        ? { case: collateralRefusal, dappOrigin }
        : null,
    [collateralRefusal, dappOrigin],
  );

/**
 * Which copy and affordances a sign-tx surface shows. A refusal outranks a
 * technical error, and suppresses the confirm button entirely rather than
 * disabling it -- the `SignTxError` idiom.
 *
 * Pure, so a surface handed a `refusal` prop can ask without a hook.
 */
export const signTxCopy = (
  refusal: SignTxRefusalDetails | null,
  hasError: boolean,
) =>
  ({
    titleKey: refusal
      ? SIGN_TX_REFUSED_KEYS.title
      : hasError
      ? ('dapp-connector.cardano.sign-tx.error-title' as const)
      : ('dapp-connector.cardano.sign-tx.title' as const),
    dismissLabelKey: refusal
      ? SIGN_TX_REFUSED_DISMISS_KEY
      : ('dapp-connector.cardano.sign-tx.cancel' as const),
    shouldSuppressPrimary: hasError || refusal !== null,
  } as const);
