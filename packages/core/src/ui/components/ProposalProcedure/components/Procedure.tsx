import React from 'react';
import { Cell, Metadata, MetadataLink, Text, sx } from '@lace/ui';
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
      {data.anchor && (
        <>
          <Cell>
            <MetadataLink label={translations.anchor.url} text={data.anchor.url} url={data.anchor.url} />
          </Cell>
          <Cell>
            <Metadata label={translations.anchor.hash} text={data.anchor.hash} />
          </Cell>
        </>
      )}
    </>
  );
};
