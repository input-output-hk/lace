import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';

import { formatPercentages } from './formatting';

import type * as ActionIdTypes from '../components/ActivityDetails/ProposalProcedures/components/ActionIdTypes';
import type * as ProcedureTypes from '../components/ActivityDetails/ProposalProcedures/components/ProcedureTypes';
import type * as TxDetailsTypes from '../components/ActivityDetails/ProposalProcedures/components/ProposalProcedureTransactionDetailsTypes';
import type { Cardano } from '@cardano-sdk/core';
import type { NetworkType } from '@lace-contract/network';

export const convertFractionToPercentage = (
  numerator?: Cardano.Fraction['numerator'],
  denominator?: Cardano.Fraction['denominator'],
): string => {
  if (numerator && denominator) {
    return formatPercentages(numerator / denominator);
  }
  return '';
};

export const getBaseGovernanceActionViewData = ({
  governanceAction,
  deposit,
  rewardAccount,
  anchor,
  explorerBaseUrl,
  networkType,
}: {
  governanceAction?: Cardano.GovernanceAction;
  deposit: Cardano.ProposalProcedure['deposit'];
  rewardAccount: Cardano.ProposalProcedure['rewardAccount'];
  anchor: Cardano.ProposalProcedure['anchor'];
  explorerBaseUrl: string;
  networkType: NetworkType;
}): {
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
  actionId?: ActionIdTypes.Data;
} => ({
  txDetails: {
    deposit: `${convertLovelacesToAda(deposit)} ${getAdaTokenTickerByNetwork(
      networkType,
    )}`,
    rewardAccount,
  },
  procedure: {
    anchor: {
      url: anchor.url,
      hash: anchor.dataHash,
      txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`,
    },
  },
  ...(governanceAction &&
    'governanceActionId' in governanceAction &&
    governanceAction.governanceActionId && {
      actionId: {
        index: governanceAction.governanceActionId.actionIndex.toString(),
        id: governanceAction.governanceActionId.id || '',
      },
    }),
});
