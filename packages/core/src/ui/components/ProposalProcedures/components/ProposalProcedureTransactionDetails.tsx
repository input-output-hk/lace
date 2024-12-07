import React from 'react';
import { Metadata, Text, sx, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './ProposalProcedureTransactionDetailsTypes';

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
  translations
}: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  return (
    <>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.title}
        </Text.Body.Large>
      </Cell>
      <Cell>
        <Metadata style={{ alignItems: 'center', background: 'red' }} label={translations.txType} text={txTitle} />
      </Cell>
      {rewardAccount && translations.rewardAccount && (
        <Cell>
          <Metadata label={translations.rewardAccount} text={rewardAccount} />
        </Cell>
      )}
      {deposit && translations.deposit && (
        <Cell>
          <Metadata label={translations.deposit} text={deposit} />
        </Cell>
      )}
    </>
  );
};
