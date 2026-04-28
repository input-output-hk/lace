import { ReviewTransactionTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useReviewTransaction } from './useReviewTransaction';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ReviewTransaction = (
  props: SheetScreenProps<SheetRoutes.ReviewTransaction>,
) => {
  const {
    labels,
    values,
    backButtonPress,
    nextButtonPress,
    isNextButtonDisabled,
  } = useReviewTransaction(props);
  return (
    <ReviewTransactionTemplate
      headerTitle={labels.headerTitle}
      labels={labels}
      backButtonPress={backButtonPress}
      nextButtonPress={nextButtonPress}
      nextButtonDisabled={isNextButtonDisabled}
      values={values}
    />
  );
};
