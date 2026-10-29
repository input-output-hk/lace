import { useMemo } from 'react';

import {
  SIGN_TX_REFUSED_DISMISS_KEY,
  SIGN_TX_REFUSED_KEYS,
} from './sign-tx-refused-keys';

import type { SignTxRefusalDetails } from './sign-tx-refused-keys';
import type { SignTxRefusal } from '../store/sign-tx-refusal';

/**
 * The guard verdict a pending request carries; `null` for a reviewable
 * request, or one whose origin is not yet known.
 * Memoized because callers put it in dependency lists; `refusal` is the object
 * the slice holds, so its identity only changes when the request does.
 */
export const useSignTxRefusal = ({
  refusal,
  dappOrigin,
}: {
  refusal?: SignTxRefusal | null;
  dappOrigin?: string;
}): SignTxRefusalDetails | null =>
  useMemo(
    () =>
      refusal && dappOrigin !== undefined ? { ...refusal, dappOrigin } : null,
    [refusal, dappOrigin],
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
