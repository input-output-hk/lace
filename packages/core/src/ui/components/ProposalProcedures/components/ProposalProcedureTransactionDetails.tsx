import React from 'react';
import { Metadata, Text, sx, Cell } from '@lace/ui';
import * as Types from './ProposalProcedureTransactionDetailsTypes';

interface Props {
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
      {rewardAccount && (
        <Cell>
          <Metadata label={translations.rewardAccount} text={rewardAccount} />
        </Cell>
      )}
      {deposit && (
        <Cell>
          <Metadata label={translations.deposit} text={deposit} />
        </Cell>
      )}
    </>
  );
};
