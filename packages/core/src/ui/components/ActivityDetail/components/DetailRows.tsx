import React from 'react';
import cn from 'classnames';
import { DetailRow } from './DetailRow';
import { TxDetails } from '../types';
import { TranslationsFor } from '@src/ui/utils/types';
import styles from '../TransactionInputOutput.module.scss';

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
      {list.map((item, index) =>
        'title' in item ? (
          <DetailRow
            key={`${testId}-${item.title}`}
            dataTestId={`${testId}-${item.title}`}
            title={translations[item.title]}
            details={item.details}
          />
        ) : (
          <>
            <div key={`${testId}-list-header`} className={cn(styles.listHeader, styles.separatorLine)}>
              <div className={styles.listHeaderTitle}>{`${item.header} ${index + 1}`}</div>
            </div>
            <DetailRows testId={testId} list={item.details} translations={translations} />
          </>
        )
      )}
    </>
  );
};
