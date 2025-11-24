/* eslint-disable complexity, sonarjs/cognitive-complexity */
import React from 'react';
import { Metadata, Text, sx, Cell } from '@input-output-hk/lace-ui-toolkit';
import { Card } from '../components/Card';
import * as Types from './ParameterChangeActionTypes';

interface Props {
  economicGroup?: Types.DeepPartial<Types.EconomicGroup>;
  translations: Types.Translations['economicGroup'] & {
    memory: Types.Translations['memory'];
    step: Types.Translations['step'];
  };
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
      {economicGroup?.minFeeA && (
        <Cell>
          <Metadata label={translations.minFeeA} tooltip={translations.tooltip.minFeeA} text={economicGroup.minFeeA} />
        </Cell>
      )}
      {economicGroup?.minFeeB && (
        <Cell>
          <Metadata label={translations.minFeeB} tooltip={translations.tooltip.minFeeB} text={economicGroup.minFeeB} />
        </Cell>
      )}
      {economicGroup?.keyDeposit && (
        <Cell>
          <Metadata
            label={translations.keyDeposit}
            tooltip={translations.tooltip.keyDeposit}
            text={economicGroup.keyDeposit}
          />
        </Cell>
      )}
      {economicGroup?.poolDeposit && (
        <Cell>
          <Metadata
            label={translations.poolDeposit}
            tooltip={translations.tooltip.poolDeposit}
            text={economicGroup.poolDeposit}
          />
        </Cell>
      )}
      {economicGroup?.rho && (
        <Cell>
          <Metadata label={translations.rho} tooltip={translations.tooltip.rho} text={economicGroup.rho} />
        </Cell>
      )}
      {economicGroup?.tau && (
        <Cell>
          <Metadata label={translations.tau} tooltip={translations.tooltip.tau} text={economicGroup.tau} />
        </Cell>
      )}
      {economicGroup?.minPoolCost && (
        <Cell>
          <Metadata
            label={translations.minPoolCost}
            tooltip={translations.tooltip.minPoolCost}
            text={economicGroup.minPoolCost}
          />
        </Cell>
      )}
      {economicGroup?.coinsPerUTxOByte && (
        <Cell>
          <Metadata
            label={translations.coinsPerUTxOByte}
            tooltip={translations.tooltip.coinsPerUTxOByte}
            text={economicGroup.coinsPerUTxOByte}
          />
        </Cell>
      )}
      {economicGroup?.price && (
        <Cell mb={'$18'}>
          <Card
            title={translations.prices}
            tooltip={translations.tooltip.prices}
            data={[
              {
                label: translations.memory,
                value: economicGroup.price.memory ?? ''
              },
              {
                label: translations.step,
                value: economicGroup.price.step ?? ''
              }
            ]}
          />
        </Cell>
      )}
    </>
  );
};
