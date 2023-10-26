import React from 'react';
import { DetailRow } from './DetailRow';
import { TxDetails } from '../TransactionType';

type DetailRowsProps = {
  list: TxDetails;
  testId: string;
};

export const DetailRows = ({ list, testId }: DetailRowsProps): React.ReactElement => (
  <>
    {list.map(({ title, details }) => (
      <DetailRow key={`${testId}-${title}`} data-testid={`${testId}-${title}`} title={title} details={details} />
    ))}
  </>
);
