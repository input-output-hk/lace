/* eslint-disable complexity */
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityStatus, Transaction, TransactionFee, TxSummary } from '@src/ui/components/Transaction';
import { CosignersList } from './CosignersList';
import { InfoBar } from './InfoBar';
import styles from './TransactionDetails.module.scss';
import { CoSignersListItem, SignPolicy } from './types';

export interface TransactionDetailsProps {
  addressToNameMap: Map<string, string>;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  cosigners: CoSignersListItem[];
  fee?: string;
  handleOpenExternalHashLink?: () => void;
  hash?: string;
  includedDate?: string;
  includedTime?: string;
  isPopupView?: boolean;
  ownSharedKey: Wallet.Crypto.Ed25519KeyHashHex;
  signPolicy: SignPolicy;
  status?: ActivityStatus;
  txInitiator: string;
  txSummary?: TxSummary[];
}

export const TransactionDetails = ({
  hash,
  status,
  fee = '-',
  amountTransformer,
  txSummary = [],
  coinSymbol,
  addressToNameMap,
  isPopupView,
  handleOpenExternalHashLink,
  cosigners,
  signPolicy,
  includedDate,
  includedTime,
  txInitiator,
  ownSharedKey,
}: TransactionDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isCosignersOpen, setIsCosignersOpen] = useState(true);

  const isSending = status === ActivityStatus.PENDING;
  const isSuccess = status === ActivityStatus.SUCCESS;

  const name = !hash ? t('sharedWallets.transaction.summary.header') : t('sharedWallets.transaction.sent.header');
  const headerDescription = !hash && t('sharedWallets.transaction.summary.unsubmitted.headerDescription');

  const role = ownSharedKey === txInitiator ? 'summary' : 'cosigners';
  const signStatus = !cosigners.some((c) => c.keyHash === ownSharedKey && c.signed) ? 'unsigned' : 'unsubmitted';
  const description = t(`sharedWallets.transaction.${role}.${signStatus}.description`);

  const signed = cosigners.filter((c) => c.signed);
  const unsigned = cosigners.filter((c) => !c.signed);

  return (
    <Transaction.Content>
      <Transaction.ActivityDetailHeader name={name} description={headerDescription} />
      <div>
        <Transaction.HeaderDescription>
          {hash ? t('sharedWallets.transaction.sent.description') : description}
        </Transaction.HeaderDescription>
        <SummaryExpander
          onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          open={isSummaryOpen}
          title={t('sharedWallets.transaction.summary.title')}
        >
          {hash && (
            <Transaction.TxHash
              hash={hash}
              success={isSuccess}
              sending={isSending}
              openLink={handleOpenExternalHashLink}
            />
          )}
          <Box mt={hash ? '$32' : '$0'}>
            <Transaction.TxSummarySection
              {...{
                addressToNameMap,
                amountTransformer,
                coinSymbol,
                isPopupView,
                name: t('sharedWallets.transaction.summary.sending'),
                ownAddresses: [],
                txSummary,
              }}
            />
          </Box>
          {status && (
            <Transaction.Detail
              titleTestId="tx-status-title"
              detailTestId="tx-status"
              title={t('core.activityDetails.status')}
              detail={`${status.charAt(0).toUpperCase()}${status.slice(1)}`}
            />
          )}
          {includedDate && includedTime && (
            <Transaction.Timestamp includedDate={includedDate} includedTime={includedTime} />
          )}
          {/* TODO: TransactionSummary.Amount is the only component with tooltip */}
          <TransactionSummary.Amount
            amount={t('sharedWallets.transaction.summary.validityPeriod.value')}
            label={t('sharedWallets.transaction.summary.validityPeriod.title')}
            tooltip={t('sharedWallets.transaction.summary.validityPeriod.tooltip')}
            data-testid="validity-period"
            className={styles.validityPeriod}
          />
          {fee && fee !== '-' && (
            <Box mb="$32" data-testid="tx-fee">
              <TransactionFee
                tooltipInfo={t('core.activityDetails.transactionFeeInfo')}
                fee={fee}
                amountTransformer={amountTransformer}
                coinSymbol={coinSymbol}
              />
            </Box>
          )}
        </SummaryExpander>
        <SummaryExpander
          onClick={() => setIsCosignersOpen(!isCosignersOpen)}
          open={isCosignersOpen}
          title={t('sharedWallets.transaction.cosigners.title')}
        >
          {!hash && <InfoBar signed={signed} signPolicy={signPolicy} />}
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
        </SummaryExpander>
      </div>
    </Transaction.Content>
  );
};
