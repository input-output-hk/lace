import React from 'react';
import { Metadata, Text, sx, Cell } from '@input-output-hk/lace-ui-toolkit';
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
        <Metadata
          label={translations.maxBBSize}
          tooltip={translations.tooltip.maxBBSize}
          text={networkGroup.maxBBSize}
        />
      </Cell>
      <Cell>
        <Metadata
          label={translations.maxTxSize}
          tooltip={translations.tooltip.maxTxSize}
          text={networkGroup.maxTxSize}
        />
      </Cell>
      <Cell>
        <Metadata
          label={translations.maxBHSize}
          tooltip={translations.tooltip.maxBHSize}
          text={networkGroup.maxBHSize}
        />
      </Cell>
      <Cell>
        <Metadata
          label={translations.maxValSize}
          tooltip={translations.tooltip.maxValSize}
          text={networkGroup.maxValSize}
        />
      </Cell>
      <Cell>
        <Metadata
          label={translations.maxCollateralInputs}
          tooltip={translations.tooltip.maxCollateralInputs}
          text={networkGroup.maxCollateralInputs}
        />
      </Cell>
    </>
  );
};
