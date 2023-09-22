import React from 'react';
import { Box, Text, TransactionSummary } from '@lace/ui';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { InsufficientFundsWarning } from '../InsufficientFundsWarning';
import { ErrorPane } from '@lace/common';
interface Props {
  dappInfo: Omit<DappInfoProps, 'className'>;
  errorMessage?: string;
  translations: {
    labels: {
      url: string;
      hash: string;
      drepId: string;
      depositPaid: string;
    };
    insufficientFundsWarning: string;
    metadata: string;
  };
  hasInsufficientFunds: boolean;
  metadata: {
    url: string;
    hash: string;
    drepId: string;
    depositPaid: string;
  };
}

export const ConfirmDRepRegistration = ({
  dappInfo,
  hasInsufficientFunds,
  errorMessage,
  translations,
  metadata
}: Props): JSX.Element => (
  <Box
    h="$fill"
    style={{
      maxWidth: '360px'
    }}
  >
    <Box mb={'$28'} mt={'$32'}>
      <DappInfo {...dappInfo} />
    </Box>
    {hasInsufficientFunds && (
      <Box mb={'$24'}>
        <InsufficientFundsWarning translations={translations.insufficientFundsWarning} />
      </Box>
    )}
    {errorMessage && (
      <Box my={'$16'}>
        <ErrorPane error={errorMessage} />
      </Box>
    )}
    <Box mb={'$24'}>
      <Text.Body.Large data-testid="section-title" weight="$bold">
        {translations.metadata}
      </Text.Body.Large>
    </Box>
    <TransactionSummary.Address label={translations.labels.url} address={metadata.url} />
    <Box mb={'$24'} />
    <TransactionSummary.Address label={translations.labels.hash} address={metadata.hash} />
    <Box mb={'$24'} />
    <TransactionSummary.Address label={translations.labels.drepId} address={metadata.drepId} />
    <Box mb={'$24'} />
    <TransactionSummary.Address label={translations.labels.depositPaid} address={metadata.depositPaid} />
  </Box>
);
