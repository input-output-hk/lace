import React from 'react';
import { Cell, Metadata, Text, sx } from '@lace/ui';
import * as Types from './ProcedureTypes';

interface Props {
  data: Types.Procedure;
  translations: Types.Translations;
}

export const Procedure = ({ data, translations }: Props): JSX.Element => {
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
        <Metadata label={translations.rewardAccount} text={data.rewardAccount} />
      </Cell>
      <Cell>
        <Metadata label={translations.deposit} text={data.deposit} />
      </Cell>
      <Cell>
        <Metadata label={translations.anchor.url} text={data.anchor?.url} />
      </Cell>
      <Cell>
        <Metadata label={translations.anchor.hash} text={data.anchor?.hash} />
      </Cell>
    </>
  );
};
