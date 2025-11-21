import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewsFlowContext } from '@providers';
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';

export const DappTransactionErrorSummary = (): React.ReactElement => {
  const { t } = useTranslation();

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const {
    signError: { error }
  } = useViewsFlowContext();

  if (typeof error !== 'object' || !error.message) return <></>;

  return (
    <Box w="$fill">
      <SummaryExpander
        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
        open={isSummaryOpen}
        title={t('browserView.transaction.fail.error-details.label')}
        plain
      >
        <TransactionSummary.Other
          label={error.name || t('browserView.transaction.fail.error-details.error-name-fallback')}
          text={error.message}
        />
      </SummaryExpander>
    </Box>
  );
};
