/* eslint-disable complexity */
import { Box, SummaryExpander, Text, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OutputSummary, OutputSummaryProps } from '../../ui/components/OutputSummary';
import { ActivityStatus, Transaction, TransactionFee } from '../../ui/components/Transaction';
import { CosignersList } from './CosignersList';
import { InfoBar } from './InfoBar';
import styles from './SharedWalletTransactionDetails.module.scss';
import { CoSignersListItem, SignPolicy } from './types';

const SHARED_WALLET_TX_VALIDITY_INTERVAL = process.env.SHARED_WALLET_TX_VALIDITY_INTERVAL;

export interface SharedWalletTransactionDetailsProps {
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  cosigners: CoSignersListItem[];
  fee: string;
  ownSharedKey: Wallet.Crypto.Bip32PublicKeyHex;
  rows: OutputSummaryProps[];
  signPolicy: SignPolicy;
  status: ActivityStatus;
  txInitiator: Wallet.Crypto.Bip32PublicKeyHex;
}

export const SharedWalletTransactionDetails = ({
  status,
  fee = '-',
  amountTransformer,
  coinSymbol,
  cosigners,
  signPolicy,
  txInitiator,
  ownSharedKey,
  rows,
}: SharedWalletTransactionDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isCosignersOpen, setIsCosignersOpen] = useState(true);

  const role = ownSharedKey === txInitiator ? 'summary' : 'cosigners';
  const signStatus = !cosigners.some((c) => c.sharedWalletKey === ownSharedKey && c.signed)
    ? 'unsigned'
    : 'unsubmitted';
  const description = t(`sharedWallets.transaction.${role}.${signStatus}.description`);

  const signed = cosigners.filter((c) => c.signed);
  const unsigned = cosigners.filter((c) => !c.signed);

  const outputSummaryTranslations = {
    bundle: t('core.outputSummaryList.output'),
    recipientAddress: t('core.outputSummaryList.recipientAddress'),
    sending: t('core.outputSummaryList.sending'),
  };

  return (
    <Transaction.Content>
      <Transaction.ActivityDetailHeader
        name={t('sharedWallets.transaction.summary.header')}
        description={t('sharedWallets.transaction.summary.unsubmitted.headerDescription')}
      />
      <div>
        <Transaction.HeaderDescription>{description}</Transaction.HeaderDescription>
        <SummaryExpander
          onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          open={isSummaryOpen}
          title={t('sharedWallets.transaction.summary.title')}
        >
          {rows.map((row, idx) => (
            <div key={`${idx}-${row.recipientAddress}`} data-testid="bundle-summary-row">
              {rows.length > 1 && (
                <Text.SubHeading weight="$bold" className={styles.bundleHeading} data-testid="bundle-summary-title">{`${
                  outputSummaryTranslations.bundle
                } ${idx + 1}`}</Text.SubHeading>
              )}
              <OutputSummary {...row} translations={outputSummaryTranslations} ownAddresses={[]} />
            </div>
          ))}
          <Transaction.Detail
            titleTestId="tx-status-title"
            detailTestId="tx-status"
            title={t('core.activityDetails.status')}
            detail={`${status.charAt(0).toUpperCase()}${status.slice(1)}`}
          />
          <TransactionSummary.Amount
            amount={t('sharedWallets.transaction.summary.validityPeriod.value', {
              hours: SHARED_WALLET_TX_VALIDITY_INTERVAL,
            })}
            label={t('sharedWallets.transaction.summary.validityPeriod.title')}
            tooltip={t('sharedWallets.transaction.summary.validityPeriod.tooltip')}
            data-testid="validity-period"
            className={styles.validityPeriod}
          />
          <Box mb="$32" testId="tx-fee">
            <TransactionFee
              tooltipInfo={t('core.activityDetails.transactionFeeInfo')}
              fee={fee}
              amountTransformer={amountTransformer}
              coinSymbol={coinSymbol}
            />
          </Box>
        </SummaryExpander>
        <SummaryExpander
          onClick={() => setIsCosignersOpen(!isCosignersOpen)}
          open={isCosignersOpen}
          title={t('sharedWallets.transaction.cosigners.title')}
        >
          <Box pb="$32">
            <InfoBar signPolicy={signPolicy} />
            {signed.length > 0 && (
              <CosignersList
                ownSharedKey={ownSharedKey}
                list={signed}
                title={t('sharedWallets.transaction.cosignerList.title.signed')}
              />
            )}
            {unsigned.length > 0 && (
              <CosignersList
                ownSharedKey={ownSharedKey}
                list={unsigned}
                title={t('sharedWallets.transaction.cosignerList.title.unsigned')}
              />
            )}
          </Box>
        </SummaryExpander>
      </div>
    </Transaction.Content>
  );
};
