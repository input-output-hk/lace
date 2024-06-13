import React from 'react';
import { Metadata, MetadataLink, Text, sx, Cell } from '@input-output-hk/lace-ui-toolkit';
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
      <>
        <Cell>
          <Metadata label={translations.anchor.hash} text={data.anchor.hash} />
        </Cell>
        <Cell>
          <MetadataLink label={translations.anchor.url} text={data.anchor.url} url={data.anchor.txHashUrl} />
        </Cell>
      </>
    </>
  );
};
