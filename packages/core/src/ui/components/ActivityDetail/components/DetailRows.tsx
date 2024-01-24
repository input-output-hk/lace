/* eslint-disable react/no-multi-comp, sonarjs/no-identical-functions */

import React from 'react';
import { DetailRow } from './DetailRow';
import { TxDetails } from '../types';
import { TranslationsFor } from '@src/ui/utils/types';

type DetailRowsProps<T extends string> = {
  list: TxDetails<T>;
  testId: string;
  translations: TranslationsFor<T>;
};

export const DetailRows = function DetailRows<T extends string>({
  list,
  testId,
  translations
}: DetailRowsProps<T>): React.ReactElement {
  return (
    <>
      {list.map(({ title, details }) => (
        <DetailRow
          key={`${testId}-${title}`}
          dataTestId={`${testId}-${title}`}
          title={translations[title]}
          details={details}
        />
      ))}
    </>
  );
};
