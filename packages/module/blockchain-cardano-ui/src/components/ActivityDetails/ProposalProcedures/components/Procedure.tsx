import React from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './ProcedureTypes';

interface Props {
  data: Types.Procedure;
  translations: Types.Translations;
}

export const Procedure = ({ data, translations }: Props): React.JSX.Element => {
  return (
    <>
      <ActivityDetailItem label={translations.title} />
      <>
        <ActivityDetailItem
          label={translations.anchor.hash}
          value={data.anchor.hash}
        />
        <ActivityDetailItem
          label={translations.anchor.url}
          value={data.anchor.url}
        />
      </>
    </>
  );
};
