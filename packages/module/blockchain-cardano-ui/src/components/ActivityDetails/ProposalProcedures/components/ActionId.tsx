import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './ActionIdTypes';

interface Props {
  data: Types.Data;
  translations: Types.Translations;
}

export const ActionId = ({ data, translations }: Props): React.JSX.Element => {
  return (
    <>
      <ActivityDetailItem label={translations.title ?? ''} />
      <ActivityDetailItem label={translations.txId} value={data.id} />
      <ActivityDetailItem
        label={translations.index}
        value={data.index.toString()}
      />
    </>
  );
};
