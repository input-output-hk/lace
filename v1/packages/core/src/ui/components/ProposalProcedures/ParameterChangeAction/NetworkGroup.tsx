/* eslint-disable consistent-return */
import React, { useMemo } from 'react';
import { Metadata, Text, sx, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './ParameterChangeActionTypes';
import { isNotNil } from '@cardano-sdk/util';

interface Props {
  networkGroup?: Partial<Types.NetworkGroup>;
  translations: Types.Translations['networkGroup'];
}

export const NetworkGroup = ({ networkGroup, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  const metadatums: JSX.Element[] | undefined = useMemo(() => {
    if (!networkGroup) return;
    return (
      Object.entries(networkGroup)
        .flatMap((entry: [keyof Types.NetworkGroup, string]) => {
          const [key, value] = entry;
          if (value) {
            return (
              <Cell key={`metadatum${key}`}>
                <Metadata label={translations[key]} tooltip={translations.tooltip[key]} text={value} />
              </Cell>
            );
          }
        })
        // eslint-disable-next-line unicorn/no-array-callback-reference
        .filter(isNotNil)
    );
  }, [networkGroup, translations]);

  return (
    <>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.title}
        </Text.Body.Large>
      </Cell>
      {metadatums}
    </>
  );
};
