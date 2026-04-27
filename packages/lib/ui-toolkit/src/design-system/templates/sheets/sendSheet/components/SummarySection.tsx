import React, { memo } from 'react';

import { spacing, useTheme } from '../../../../../design-tokens';
import { Column, Divider, Row, Text } from '../../../../atoms';

import type { SendSheetProps } from '../sendSheet';

interface SummarySectionProps {
  copies: Pick<SendSheetProps['copies'], 'estimatedFeeLabel'>;
  values: Pick<SendSheetProps['values'], 'estimatedFee'>;
  testIdPrefix?: string;
  utils: Pick<
    SendSheetProps['utils'],
    'shouldShowFiatConversion' | 'txBuildError'
  >;
}

export const SummarySection = memo(
  ({ copies, values, testIdPrefix, utils }: SummarySectionProps) => {
    const { estimatedFeeLabel } = copies;
    const { estimatedFee } = values;
    const { shouldShowFiatConversion, txBuildError } = utils;
    const { theme } = useTheme();
    return (
      <Column gap={spacing.L}>
        <Divider />
        <Row justifyContent="space-between">
          <Text.S
            variant="secondary"
            testID={`${testIdPrefix}-estimated-fee-label`}>
            {estimatedFeeLabel}
          </Text.S>
          <Column alignItems="flex-end">
            {estimatedFee.length === 0 ? (
              <Column alignItems="flex-end">
                <Text.S testID={`${testIdPrefix}-estimated-fee-dash`}>-</Text.S>
                <Text.S testID={`${testIdPrefix}-estimated-fee-space`}>
                  {' '}
                </Text.S>
              </Column>
            ) : (
              estimatedFee.map((fee, index) => (
                <Column key={index} alignItems="flex-end">
                  <Text.S
                    testID={`${testIdPrefix}-estimated-fee-amount-and-short-name-${index}`}>
                    {fee.amount.toString()} {fee.token.displayShortName}
                  </Text.S>
                  {shouldShowFiatConversion && fee.value && fee.currency ? (
                    <Text.S
                      variant="secondary"
                      testID={`${testIdPrefix}-estimated-fee-value-and-currency-${index}`}>
                      {fee.value} {fee.currency}
                    </Text.S>
                  ) : (
                    <Text.S
                      testID={`${testIdPrefix}-estimated-fee-empty-currency`}>
                      {' '}
                    </Text.S>
                  )}
                </Column>
              ))
            )}
          </Column>
        </Row>
        {!!txBuildError && (
          <Text.XS
            style={{ color: theme.data.negative }}
            testID={`${testIdPrefix}-tx-build-error`}>
            {txBuildError}
          </Text.XS>
        )}
      </Column>
    );
  },
);
