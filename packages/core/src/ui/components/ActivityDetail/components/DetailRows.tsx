import React from 'react';
import cn from 'classnames';
import { DetailRow } from './DetailRow';
import { TxDetails } from '../types';
import styles from '../TransactionInputOutput.module.scss';

type DetailRowsProps<T extends string> = {
  list: TxDetails<T>;
  testId: string;
  translations: Record<T, string>;
};

export const DetailRows = function DetailRows<T extends string>({
  list,
  testId,
  translations
}: DetailRowsProps<T>): React.ReactElement {
  return (
    <>
      {list?.map((item, index) =>
        'title' in item ? (
          <DetailRow
            key={`${testId}-${item.title}`}
            dataTestId={`${testId}-${item.title}`}
            title={translations[item.title]}
            info={translations[item.info]}
            details={item.details}
          />
        ) : (
          <>
            <div
              key={`${testId}-list-header`}
              className={cn(styles.listHeader, { [styles.topBorderContent]: index > 0 })}
            >
              <div className={styles.listHeaderTitle}>{translations[item.header]}</div>
            </div>
            <DetailRows testId={testId} list={item.details} translations={translations} />
          </>
        )
      )}
    </>
  );
};
