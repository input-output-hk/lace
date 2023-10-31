import React from 'react';
import { Cell, Metadata, Text, sx } from '@lace/ui';
import { Card } from '../components/Card';
import * as Types from './ParameterChangeActionTypes';

interface Props {
  networkGroup: Types.NetworkGroup;
  translations: Types.Translations['networkGroup'];
}

export const NetworkGroup = ({ networkGroup, translations }: Props): JSX.Element => {
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
        <Metadata label="Max BB Size" tooltip={translations.tooltip.maxBBSize} text={networkGroup.maxBBSize} />
      </Cell>
      <Cell>
        <Metadata label="Max Tx Size" tooltip={translations.tooltip.maxTxSize} text={networkGroup.maxTxSize} />
      </Cell>
      <Cell>
        <Metadata label="Max BH Size" tooltip={translations.tooltip.maxBHSize} text={networkGroup.maxBHSize} />
      </Cell>
      <Cell>
        <Metadata label="Max Val Size" tooltip={translations.tooltip.maxValSize} text={networkGroup.maxValSize} />
      </Cell>
      <Cell>
        <Metadata
          label="Max Collateral Inputs"
          tooltip={translations.tooltip.maxCollateralInputs}
          text={networkGroup.maxCollateralInputs}
        />
      </Cell>
      <Cell>
        <Card
          title="Max Tx Ex Units"
          tooltip={translations.tooltip.maxTxExUnits}
          data={[
            {
              label: 'Memory',
              value: networkGroup.maxTxExUnits.memory
            },
            {
              label: 'Step',
              value: networkGroup.maxTxExUnits.step
            }
          ]}
        />
      </Cell>
      <Cell>
        <Card
          title="Max Block Ex Units"
          tooltip={translations.tooltip.maxBlockExUnits}
          data={[
            {
              label: 'Memory',
              value: networkGroup.maxBlockExUnits.memory
            },
            {
              label: 'Step',
              value: networkGroup.maxBlockExUnits.step
            }
          ]}
        />
      </Cell>
    </>
  );
};
