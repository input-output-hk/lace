import { useTranslation } from '@lace-contract/i18n';
import { Icon, Row, spacing, Text, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';

import { calculateAdaFiatValue } from '../../utils/sign-tx-utils';
import {
  formatLovelaceToAda,
  type TransactionInfo,
} from '../../utils/transaction-inspector';

import { CollapsibleSection } from './CollapsibleSection';
import { InfoRow } from './InfoRow';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export interface AdditionalInfoSectionProps {
  /** Parsed transaction info (fee, deposit, returned deposit) */
  transactionInfo: TransactionInfo;
  /** Total collateral value in lovelace, or undefined */
  collateralValue: bigint | undefined;
  /** Coin symbol (e.g. ADA) */
  coinSymbol: string;
  /** Token prices for fiat conversion */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. USD) */
  currencyTicker?: string;
}

/**
 * Collapsible section showing additional transaction info:
 * collateral, returned deposit, deposit, and fee (with optional fiat).
 */
export const AdditionalInfoSection = ({
  transactionInfo,
  collateralValue,
  coinSymbol,
  tokenPrices,
  currencyTicker,
}: AdditionalInfoSectionProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <CollapsibleSection
      title={t('dapp-connector.cardano.sign-tx.additional-info-label')}
      showInfoIcon={false}
      defaultOpen={true}
      testID="sign-tx-additional-info">
      {collateralValue !== undefined && collateralValue > BigInt(0) && (
        <InfoRow
          label={
            <Row alignItems="center" gap={spacing.S}>
              <Text.XS variant="secondary">
                {t('dapp-connector.cardano.sign-tx.collateral-label')}
              </Text.XS>
              <Icon
                name="InformationCircle"
                size={16}
                color={theme.text.secondary}
                variant="stroke"
              />
            </Row>
          }
          value={`${formatLovelaceToAda(collateralValue)} ${coinSymbol}`}
          testID="sign-tx-collateral"
        />
      )}
      {transactionInfo.returnedDeposit > BigInt(0) && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.returned-deposit-label')}
          value={`+${formatLovelaceToAda(
            transactionInfo.returnedDeposit,
          )} ${coinSymbol}`}
          secondaryValue={calculateAdaFiatValue(
            transactionInfo.returnedDeposit,
            tokenPrices,
            currencyTicker,
          )}
          testID="sign-tx-returned-deposit"
        />
      )}
      {transactionInfo.deposit > BigInt(0) && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.deposit-label')}
          value={`${formatLovelaceToAda(
            transactionInfo.deposit,
          )} ${coinSymbol}`}
          testID="sign-tx-deposit"
        />
      )}
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.estimated-fee-label')}
        value={`${formatLovelaceToAda(transactionInfo.fee)} ${coinSymbol}`}
        secondaryValue={calculateAdaFiatValue(
          transactionInfo.fee,
          tokenPrices,
          currencyTicker,
        )}
        testID="sign-tx-fee"
      />
    </CollapsibleSection>
  );
};
