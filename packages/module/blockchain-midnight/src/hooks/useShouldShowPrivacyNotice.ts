import { isSendFlowFormStep } from '@lace-contract/send-flow';
import { isShieldedFromMetadata } from '@lace-lib/ui-toolkit';
import { useMemo } from 'react';

import { computeTxRestrictions } from '../exported-modules/computeTxRestrictions';
import { useLaceSelector } from '../hooks';

/**
 * Hook to check if the privacy notice should be shown when sending shielded tokens
 * or to a shielded address. Uses the same logic as the generic send sheet:
 * - hasShieldedToken: any asset in the transfer has kind === 'shielded'
 * - isAddressShielded: txRestrictions.addressRestrictions.isRestricted from computeTxRestrictions
 *
 * Only used by Midnight NoticeComponent, so blockchain is always Midnight.
 */
export const useShouldShowPrivacyNotice = (): boolean => {
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');
  const networkId = useLaceSelector(
    'network.selectActiveNetworkId',
    'Midnight',
  );

  return useMemo(() => {
    try {
      if (!isSendFlowFormStep(sendFlowState)) {
        return false;
      }

      const hasShieldedToken = sendFlowState.form.tokenTransfers.some(
        transfer => isShieldedFromMetadata(transfer.token.value.metadata),
      );

      const existingTransferTokens = networkId
        ? sendFlowState.form.tokenTransfers.map(transfer => ({
            blockchainSpecific:
              transfer.token.value.metadata?.blockchainSpecific,
          }))
        : null;
      const isAddressShielded = existingTransferTokens
        ? computeTxRestrictions({
            tokens: [],
            selectedTokenIds: [],
            existingTransferTokens,
            recipientAddress: sendFlowState.form.address.value ?? '',
            networkId: networkId!,
          }).addressRestrictions.isRestricted
        : false;

      return hasShieldedToken || isAddressShielded;
    } catch {
      return false;
    }
  }, [sendFlowState, networkId]);
};
