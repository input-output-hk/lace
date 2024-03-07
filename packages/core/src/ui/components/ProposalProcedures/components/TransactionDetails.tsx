import React from 'react';
import { Metadata, Text, sx, Cell } from '@lace/ui';
import * as Types from './TransactionDetailsTypes';

interface Props {
  data: Types.TxDetails;
  translations: Types.Translations;
}

export const TransactionDetails = ({ data, translations }: Props): JSX.Element => {
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
        <Metadata style={{ alignItems: 'center', background: 'red' }} label={translations.txType} text={data.txType} />
      </Cell>
      {data.rewardAccount && (
        <Cell>
          <Metadata label={translations.rewardAccount} text={data.rewardAccount} />
        </Cell>
      )}
      {data.deposit && (
        <Cell>
          <Metadata label={translations.deposit} text={data.deposit} />
        </Cell>
      )}
    </>
  );
};
