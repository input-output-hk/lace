import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './ProposalProcedureTransactionDetailsTypes';

export interface Props {
  txTitle: string;
  deposit?: string;
  rewardAccount?: string;
  translations: Types.Translations;
}

export const ProposalProcedureTransactionDetails = ({
  txTitle,
  deposit,
  rewardAccount,
  translations,
}: Props): React.JSX.Element => {
  return (
    <>
      <ActivityDetailItem label={translations.title} />
      <ActivityDetailItem label={translations.txType} value={txTitle} />
      {rewardAccount && translations.rewardAccount && (
        <ActivityDetailItem
          label={translations.rewardAccount}
          value={rewardAccount}
        />
      )}
      {deposit && translations.deposit && (
        <ActivityDetailItem label={translations.deposit} value={deposit} />
      )}
    </>
  );
};
