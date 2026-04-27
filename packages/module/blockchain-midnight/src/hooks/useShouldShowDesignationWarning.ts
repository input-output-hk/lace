import {
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { isSendFlowFormStep } from '@lace-contract/send-flow';
import { useMemo } from 'react';

import { useLaceSelector } from './lace-context';
import { useMidnightDustData } from './useMidnightDustData';

import type { MidnightSpecificSendFlowData } from '@lace-contract/midnight-context';

/**
 * Hook to check if the designation warning should be shown when sending NIGHT tokens.
 * This hook checks if:
 * 1. Send flow is on Form step (Form, FormPendingValidation, FormTxBuilding)
 * 2. NIGHT token is being sent
 * 3. Dust status for the current account indicates designation can be affected (status !== 'empty')
 *
 * @returns boolean indicating whether to show the designation warning
 */
export const useShouldShowDesignationWarning = (): boolean => {
  const networkId = useLaceSelector('midnightContext.selectNetworkId');
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts') ?? [];
  const dustDataByAccount = useMidnightDustData(accounts);
  const nightTokenId = toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId);
  const nightToken = useLaceSelector('tokens.selectTokenById', nightTokenId);
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');

  return useMemo(() => {
    try {
      if (!nightToken) {
        return false;
      }

      if (!isSendFlowFormStep(sendFlowState)) {
        return false;
      }

      const accountId = sendFlowState.accountId;
      const dustData = accountId ? dustDataByAccount[accountId] : undefined;
      const hasActiveDesignation = !!dustData && dustData.status !== 'empty';

      const blockchainSpecificData = sendFlowState.blockchainSpecificData as
        | MidnightSpecificSendFlowData
        | undefined;
      if (blockchainSpecificData?.flowType === 'dust-designation') {
        return false;
      }

      const isSendingNight = sendFlowState.form.tokenTransfers.some(
        transfer => transfer.token.value.tokenId === nightToken.tokenId,
      );

      return isSendingNight && hasActiveDesignation;
    } catch {
      return false;
    }
  }, [sendFlowState, nightToken, dustDataByAccount]);
};
