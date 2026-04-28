import { isNotNil } from '@cardano-sdk/util';
import React, { useMemo } from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './types';

interface Props {
  networkGroup?: Partial<Types.NetworkGroup>;
  translations: Types.Translations['networkGroup'];
}

export const NetworkGroup = ({
  networkGroup,
  translations,
}: Props): React.JSX.Element => {
  const metadatums: React.JSX.Element[] | undefined = useMemo(() => {
    if (!networkGroup) return;
    const networkGroupEntries = Object.entries(networkGroup) as [
      keyof Types.NetworkGroup,
      string,
    ][];
    return networkGroupEntries
      .flatMap(entry => {
        const [key, value] = entry;
        if (value) {
          return (
            <ActivityDetailItem
              key={key}
              label={translations[key]}
              value={value}
            />
          );
        }
      })

      .filter(isNotNil);
  }, [networkGroup, translations]);

  return (
    <>
      <ActivityDetailItem label={translations.title} />
      {metadatums}
    </>
  );
};
