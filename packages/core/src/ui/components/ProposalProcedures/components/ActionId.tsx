import React from 'react';
import { Cell, sx, Metadata, Text } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './ActionIdTypes';

interface Props {
  data: Types.Data;
  translations: Types.Translations;
}

export const ActionId = ({ data, translations }: Props): JSX.Element => {
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
        <Metadata label={translations.txId} text={data.id} />
      </Cell>
      <Cell>
        <Metadata label={translations.index} text={data.index.toString()} />
      </Cell>
    </>
  );
};
