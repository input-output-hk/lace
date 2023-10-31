import React from 'react';
import { Cell, Metadata, Text, sx } from '@lace/ui';
import { Card } from '../components/Card';
import * as Types from './ParameterChangeActionTypes';

interface Props {
  economicGroup: Types.EconomicGroup;
  translations: Types.Translations['economicGroup'];
}

export const EconomicGroup = ({ economicGroup, translations }: Props): JSX.Element => {
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
        <Metadata label="Min Fee A" tooltip={translations.tooltip.minFeeA} text={economicGroup.minFeeA} />
      </Cell>
      <Cell>
        <Metadata label="Min Fee B" tooltip={translations.tooltip.minFeeB} text={economicGroup.minFeeB} />
      </Cell>
      <Cell>
        <Metadata label="Key Deposit" tooltip={translations.tooltip.keyDeposit} text={economicGroup.keyDeposit} />
      </Cell>
      <Cell>
        <Metadata label="Pool Deposit" tooltip={translations.tooltip.poolDeposit} text={economicGroup.poolDeposit} />
      </Cell>
      <Cell>
        <Metadata label="Rho" tooltip={translations.tooltip.rho} text={economicGroup.rho} />
      </Cell>
      <Cell>
        <Metadata label="Tau" tooltip={translations.tooltip.tau} text={economicGroup.tau} />
      </Cell>
      <Cell>
        <Metadata label="Min Pool Cost" tooltip={translations.tooltip.minPoolCost} text={economicGroup.minPoolCost} />
      </Cell>
      <Cell>
        <Metadata
          label="Coins Per UTxO Byte"
          tooltip={translations.tooltip.coinsPerUTxOByte}
          text={economicGroup.coinsPerUTxOByte}
        />
      </Cell>
      <Cell>
        <Card
          title="Prices"
          tooltip={translations.tooltip.prices}
          data={[
            {
              label: 'Memory',
              value: economicGroup.price.memory
            },
            {
              label: 'Step',
              value: economicGroup.price.step
            }
          ]}
        />
      </Cell>
    </>
  );
};
