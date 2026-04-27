import { SendResultTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useSendResult } from './useSendResult';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SendResult = (props: SheetScreenProps<SheetRoutes.SendResult>) => {
  const {
    headerTitle,
    icon,
    subtitle,
    errorDetails,
    footer,
    result,
    transactionDetails,
    transactionDetailsLabels,
    shouldHidePrimaryButtonOnSuccess,
  } = useSendResult(props);

  return (
    <SendResultTemplate
      headerTitle={headerTitle}
      transactionState={result}
      subtitle={subtitle}
      icon={icon}
      transactionDetails={transactionDetails}
      labels={transactionDetailsLabels}
      footer={footer}
      errorDetails={errorDetails}
      hidePrimaryButtonOnSuccess={shouldHidePrimaryButtonOnSuccess}
    />
  );
};
