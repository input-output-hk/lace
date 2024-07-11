/* eslint-disable complexity */
import React from 'react';
import cn from 'classnames';
import { Ellipsis } from '@lace/common';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import { TransactionDetailAsset, TransactionMetadataProps, TxOutputInput, TxSummary } from './TransactionDetailAsset';
import { ActivityStatus } from '../Activity';
import styles from './TransactionDetails.module.scss';
import { TransactionInputOutput } from './TransactionInputOutput';
import { TransactionFee } from './TransactionFee';
import { ActivityDetailHeader } from './ActivityDetailHeader';
import { Collateral, CollateralStatus } from './Collateral';
import { Wallet } from '@lace/cardano';
import { TxDetailsCertificates } from './components/TxDetailsCertificates/TxDetailsCertificates';
import { TxDetailsVotingProcedures } from './components/TxDetailsVotingProcedures';
import { TxDetailsProposalProcedures } from './components/TxDetailsProposalProcedures';
import { useTranslation } from 'react-i18next';
import { Transaction } from '../Transaction';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayMetadataMsg = (value: any[]): string => value?.find((val: any) => val.hasOwnProperty('msg'))?.msg || '';

export interface TransactionDetailsProps {
  hash?: string;
  name: string;
  status?: ActivityStatus;
  /**
   * Transaction generation date
   */
  includedDate?: string;
  /**
   * Transaction generation time
   */
  includedTime?: string;
  assets?: TransactionDetailAsset[];
  /**
   * Input address list
   */
  addrInputs?: TxOutputInput[];
  /**
   * Output address list
   */
  addrOutputs?: TxOutputInput[];
  /**
   * Transaction total output
   */
  totalOutput?: string;
  /**
   * Transaction collateral
   */
  collateral?: string;
  /**
   * Transaction fee
   */
  fee?: string;
  pools?: { name: string; ticker: string; id: string }[];
  /**
   * Transaction deposit
   */
  deposit?: string;
  /**
   * Transaction returned deposit
   */
  depositReclaim?: string;
  /**
   * Transaction metadata
   */
  metadata?: TransactionMetadataProps['metadata'];
  amountTransformer: (amount: string) => string;
  headerDescription?: string;
  txSummary?: TxSummary[];
  coinSymbol: string;
  tooltipContent?: string;
  ownAddresses: string[];
  addressToNameMap: Map<string, string>;
  isPopupView?: boolean;
  handleOpenExternalHashLink?: () => void;
  sendAnalyticsInputs?: () => void;
  sendAnalyticsOutputs?: () => void;
  votingProcedures?: Wallet.Cardano.VotingProcedures;
  proposalProcedures?: Wallet.Cardano.ProposalProcedure[];
  certificates?: Wallet.Cardano.Certificate[];
  chainNetworkId: Wallet.Cardano.NetworkId;
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}

export const TransactionDetails = ({
  hash,
  name,
  status,
  headerDescription,
  includedDate = '-',
  includedTime = '-',
  fee = '-',
  deposit,
  depositReclaim,
  addrInputs,
  addrOutputs,
  metadata,
  amountTransformer,
  txSummary = [],
  coinSymbol,
  pools,
  ownAddresses,
  addressToNameMap,
  isPopupView,
  handleOpenExternalHashLink,
  sendAnalyticsInputs,
  sendAnalyticsOutputs,
  proposalProcedures,
  votingProcedures,
  collateral,
  certificates,
  chainNetworkId,
  cardanoCoin,
  explorerBaseUrl
}: TransactionDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const isSending = status === ActivityStatus.PENDING;
  const isSuccess = status === ActivityStatus.SUCCESS;

  const getCollateralStatus = (): CollateralStatus => {
    switch (status) {
      case ActivityStatus.SPENDABLE:
        return CollateralStatus.NONE;
      case ActivityStatus.PENDING:
        return CollateralStatus.REVIEW;
      case ActivityStatus.SUCCESS:
        return CollateralStatus.SUCCESS;
      case ActivityStatus.ERROR:
        return CollateralStatus.ERROR;
      default:
        return CollateralStatus.REVIEW;
    }
  };

  const renderDepositValueSection = ({ value, label }: { value: string; label: string }) => (
    <div className={styles.details}>
      <div className={styles.title}>{label}</div>
      <div className={styles.detail}>
        <div className={styles.amount}>
          <span className={styles.ada}>{`${value} ${coinSymbol}`}</span>{' '}
          <span className={styles.fiat}>{amountTransformer(value)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Transaction.Content>
      <ActivityDetailHeader name={name} description={headerDescription} />
      <div>
        <Transaction.HeaderDescription>{t('core.activityDetails.header')}</Transaction.HeaderDescription>
        <Transaction.Block>
          <Transaction.TxHash
            hash={hash}
            success={isSuccess}
            sending={isSending}
            openLink={handleOpenExternalHashLink}
          />
          <Transaction.Summary>{t('core.activityDetails.summary')}</Transaction.Summary>
          {pools?.length > 0 && (
            <div className={styles.stakingInfo}>
              <div className={cn(styles.title, styles.poolsTitle)}>{t('core.activityDetails.pools')}</div>
              <div className={styles.poolsList}>
                {pools?.map((pool) => (
                  <div key={pool.id} className={styles.poolEntry}>
                    <div className={styles.poolHeading}>
                      {pool.name && (
                        <div data-testid="tx-pool-name" className={styles.detail}>
                          {pool.name}
                        </div>
                      )}
                      {pool.ticker && (
                        <div data-testid="tx-pool-ticker" className={cn(styles.detail, styles.lightLabel)}>
                          ({pool.ticker})
                        </div>
                      )}
                    </div>
                    {pool.id && (
                      <div data-testid="tx-pool-id" className={cn(styles.detail, styles.poolId, styles.lightLabel)}>
                        <Ellipsis text={pool.id} ellipsisInTheMiddle />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Transaction.TxSummarySection
            {...{ txSummary, name, amountTransformer, coinSymbol, addressToNameMap, isPopupView, ownAddresses }}
          />
          <Transaction.Detail
            titleTestId="tx-status-title"
            detailTestId="tx-status"
            title={t('core.activityDetails.status')}
            detail={status && `${status.charAt(0).toUpperCase()}${status.slice(1)}`}
          />
          <Transaction.Timestamp includedDate={includedDate} includedTime={includedTime} />
          {collateral && (
            <Box mb="$32" data-testid="tx-collateral">
              <Collateral
                collateral={collateral}
                amountTransformer={amountTransformer}
                coinSymbol={coinSymbol}
                status={getCollateralStatus()}
              />
            </Box>
          )}
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
          {deposit && renderDepositValueSection({ value: deposit, label: t('core.activityDetails.deposit') })}
          {depositReclaim &&
            renderDepositValueSection({
              value: depositReclaim,
              label: t('core.activityDetails.depositReclaim')
            })}
        </Transaction.Block>
        {votingProcedures?.length > 0 && (
          <TxDetailsVotingProcedures votingProcedures={votingProcedures} explorerBaseUrl={explorerBaseUrl} />
        )}
        {proposalProcedures?.length > 0 && (
          <TxDetailsProposalProcedures
            proposalProcedures={proposalProcedures}
            cardanoCoin={cardanoCoin}
            explorerBaseUrl={explorerBaseUrl}
          />
        )}
        {certificates?.length > 0 && (
          <TxDetailsCertificates
            certificates={certificates}
            chainNetworkId={chainNetworkId}
            cardanoCoin={cardanoCoin}
          />
        )}
        {addrInputs?.length > 0 && (
          <TransactionInputOutput
            amountTransformer={amountTransformer}
            title={t('core.activityDetails.inputs')}
            testId="tx-inputs"
            list={addrInputs}
            translations={{
              address: t('core.activityDetails.address'),
              sent: t('core.activityDetails.sent')
            }}
            coinSymbol={coinSymbol}
            withSeparatorLine
            sendAnalytics={sendAnalyticsInputs}
            ownAddresses={ownAddresses}
            addressToNameMap={addressToNameMap}
          />
        )}
        {addrOutputs?.length > 0 && (
          <TransactionInputOutput
            amountTransformer={amountTransformer}
            title={t('core.activityDetails.outputs')}
            testId="tx-outputs"
            list={addrOutputs}
            translations={{
              address: t('core.activityDetails.address'),
              sent: t('core.activityDetails.sent')
            }}
            coinSymbol={coinSymbol}
            sendAnalytics={sendAnalyticsOutputs}
            ownAddresses={ownAddresses}
            addressToNameMap={addressToNameMap}
          />
        )}
        {metadata?.length > 0 && (
          <div className={styles.metadataContainer}>
            <div className={styles.metadataLabel} data-testid="tx-metadata-title">
              {t('core.activityDetails.metadata')}
            </div>
            <div className={styles.detail} data-testid="tx-metadata">
              {metadata?.map((item) => (
                <div key={item.key} className={styles.detail} data-testid={`tx-metadata-row-${item.key}`}>
                  {/* there are two options here item.value could be an array or string, if it is an array format item.value using displayMetadataMsg, if not just use item.value */}
                  {Array.isArray(item.value) ? displayMetadataMsg(item.value) : item.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Transaction.Content>
  );
};
