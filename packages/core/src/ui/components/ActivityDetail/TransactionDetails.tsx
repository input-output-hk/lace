/* eslint-disable no-magic-numbers */
import React from 'react';
import cn from 'classnames';
import { TransactionDetailAsset, TransactionMetadataProps, TxOutputInput, TxSummary } from './TransactionDetailAsset';
import { Ellipsis, toast } from '@lace/common';
import { Box } from '@lace/ui';
import { useTranslate } from '@src/ui/hooks';
import CopyToClipboard from 'react-copy-to-clipboard';
import { ActivityStatus } from '../Activity';
import styles from './TransactionDetails.module.scss';
import { TransactionInputOutput } from './TransactionInputOutput';
import { TransactionFee } from './TransactionFee';
import { ActivityDetailHeader } from './ActivityDetailHeader';
import { TxDetailList } from './TxDetailsList';
import {
  TxDetailsVotingProceduresTitles,
  TxDetailsProposalProceduresTitles,
  TxDetailsCertificateTitles,
  TxDetails,
  TxDetail
} from './types';

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
  addressToNameMap: Map<string, string>;
  isPopupView?: boolean;
  openExternalLink?: () => void;
  sendAnalyticsInputs?: () => void;
  sendAnalyticsOutputs?: () => void;
  votingProcedures?: TxDetails<TxDetailsVotingProceduresTitles>[];
  proposalProcedures?: TxDetails<TxDetailsProposalProceduresTitles>[];
  certificates?: TxDetails<TxDetailsCertificateTitles>[];
}

const TOAST_DEFAULT_DURATION = 3;

const CopiableHash = ({ hash, copiedText }: { hash: string; copiedText: string }) => (
  <CopyToClipboard text={hash}>
    <div
      onClick={() =>
        toast.notify({
          duration: TOAST_DEFAULT_DURATION,
          text: copiedText
        })
      }
    >
      {hash}
    </div>
  </CopyToClipboard>
);

// eslint-disable-next-line react/no-multi-comp,complexity
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
  addressToNameMap,
  isPopupView,
  openExternalLink,
  sendAnalyticsInputs,
  sendAnalyticsOutputs,
  proposalProcedures,
  votingProcedures,
  certificates
}: TransactionDetailsProps): React.ReactElement => {
  const { t } = useTranslate();
  const isSending = status === ActivityStatus.PENDING;
  const isSuccess = status === ActivityStatus.SUCCESS;

  // Translate certificate typenames
  const translatedCertificates = certificates?.map((certificate) =>
    certificate?.map(
      (detail) =>
        ({
          ...detail,
          ...('title' in detail &&
            detail.title === 'certificateType' && {
              details: [t(`package.core.assetActivityItem.entry.certificates.typenames.${detail.details[0]}`)]
            })
        } as TxDetail<TxDetailsCertificateTitles>)
    )
  );

  // Translate governance proposal typenames
  const translatedProposalProcedures = proposalProcedures?.map((proposal) =>
    proposal?.map(
      (p) =>
        ({
          ...p,
          ...('title' in p &&
            p.title === 'type' && {
              details: [t(`package.core.activityDetails.governanceActions.${p.details[0]}`)]
            })
        } as TxDetail<TxDetailsProposalProceduresTitles>)
    )
  );

  // Translate voting procedure typenames
  const translatedVotingProcedures = votingProcedures?.map((proposal) =>
    proposal?.map(
      (p) =>
        ({
          ...p,
          ...('title' in p &&
            ['voterType', 'credentialType', 'voteTypes'].includes(p.title) && {
              details: [t(`package.core.activityDetails.${p.title}.${p.details[0]}`)]
            })
        } as TxDetail<TxDetailsVotingProceduresTitles>)
    )
  );

  const renderDepositValueSection = ({ value, label }: { value: string; label: string }) => (
    <div className={styles.details}>
      <div className={styles.title}>{label}</div>
      <div className={styles.detail}>
        <div className={styles.amount}>
          <span className={styles.ada}>{`${value} ${coinSymbol}`}</span>
          <span className={styles.fiat}>{amountTransformer(value)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div data-testid="transaction-detail" className={styles.content}>
      <ActivityDetailHeader name={name} description={headerDescription} />
      <div>
        <div className={styles.header} data-testid="tx-header">
          {t('package.core.activityDetails.header')}
        </div>
        <div className={styles.block}>
          <div data-testid="tx-hash" className={styles.hashContainer}>
            <div className={cn(styles.title, styles.labelWidth)}>
              <div className={styles.hashLabel}>{t('package.core.activityDetails.transactionID')}</div>
            </div>
            <div
              data-testid="tx-hash-detail"
              className={cn(styles.detail, {
                [styles.hash]: openExternalLink,
                [styles.txLink]: isSuccess && !!openExternalLink
              })}
              onClick={openExternalLink}
            >
              <div>
                {isSending ? (
                  <CopiableHash hash={hash} copiedText={t('package.core.activityDetails.copiedToClipboard')} />
                ) : (
                  hash
                )}
              </div>
            </div>
          </div>

          <h1 className={styles.summary}>{t('package.core.activityDetails.summary')}</h1>
          {pools?.length > 0 && (
            <div className={styles.stakingInfo}>
              <div className={cn(styles.title, styles.poolsTitle)}>{t('package.core.activityDetails.pools')}</div>
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
          {txSummary.map((summary, index) => (
            <div key={index.toString()} data-testid="tx-detail-bundle">
              <div className={styles.details}>
                <div className={styles.title}>{name}</div>
                <div data-testid="tx-sent-detail" className={styles.detail}>
                  {summary.assetList?.map((asset, i) => (
                    <div className={styles.amount} key={`asset${i}`}>
                      <span data-testid="tx-sent-detail-token">
                        {asset.amount} {asset.symbol}
                      </span>
                      {asset?.fiatBalance && (
                        <span className={styles.fiat} data-testid="tx-sent-detail-token-fiat">
                          {asset.fiatBalance}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className={styles.amount}>
                    <span
                      className={styles.ada}
                      data-testid="tx-sent-detail-ada"
                    >{`${summary.amount} ${coinSymbol}`}</span>
                    <span className={styles.fiat} data-testid="tx-sent-detail-fiat">{`${amountTransformer(
                      summary.amount
                    )}`}</span>
                  </div>
                </div>
              </div>
              <div className={styles.details}>
                <div className={styles.title}>
                  {t(`package.core.activityDetails.${name.toLowerCase() === 'sent' ? 'to' : 'from'}`)}
                </div>
                <div>
                  {summary.addr.length > 1 && (
                    <div
                      data-testid="tx-to-detail-multiple-addresses"
                      className={cn(styles.detail, styles.detailTitle)}
                    >
                      {t('package.core.activityDetails.multipleAddresses')}
                    </div>
                  )}
                  {(summary.addr as string[]).map((addr) => {
                    const addrName = addressToNameMap?.get(addr);
                    const address = isPopupView ? (
                      <Ellipsis className={cn(styles.addr, styles.fiat)} text={addr} ellipsisInTheMiddle />
                    ) : (
                      <span className={cn(styles.addr, styles.fiat)}>{addr}</span>
                    );
                    return (
                      <div key={addr} data-testid="tx-to-detail" className={cn(styles.addr, styles.detail)}>
                        {addrName ? (
                          <div className={styles.amount}>
                            <span className={cn(styles.ada, styles.addrName)}>{addrName}</span>
                            {address}
                          </div>
                        ) : (
                          address
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          <div className={styles.details}>
            <div className={styles.title}>{t('package.core.activityDetails.status')}</div>
            {status && (
              <div data-testid="tx-status" className={styles.detail}>{`${status.charAt(0).toUpperCase()}${status.slice(
                1
              )}`}</div>
            )}
          </div>
          <div data-testid="tx-date" className={cn(styles.details, styles.timestampContainer)}>
            <div className={cn(styles.title, styles.timestamp)}>{t('package.core.activityDetails.timestamp')}</div>
            <div data-testid="tx-timestamp" className={styles.detail}>
              <span>{includedDate}</span>
              <span>&nbsp;{includedTime}</span>
            </div>
          </div>
          {fee && fee !== '-' && (
            <Box mb="$32">
              <TransactionFee fee={fee} amountTransformer={amountTransformer} coinSymbol={coinSymbol} />
            </Box>
          )}
          {deposit && renderDepositValueSection({ value: deposit, label: t('package.core.activityDetails.deposit') })}
          {depositReclaim &&
            renderDepositValueSection({
              value: depositReclaim,
              label: t('package.core.activityDetails.depositReclaim')
            })}
        </div>

        {votingProcedures?.length > 0 && (
          <TxDetailList<TxDetailsVotingProceduresTitles>
            testId="voting-procedures"
            title={t('package.core.activityDetails.votingProcedures')}
            subTitle={t('package.core.activityDetails.votingProcedure')}
            lists={translatedVotingProcedures}
            translations={{
              voterType: t('package.core.activityDetails.votingProcedureTitles.voterType'),
              credentialType: t('package.core.activityDetails.votingProcedureTitles.credentialType'),
              voteTypes: t('package.core.activityDetails.votingProcedureTitles.voteTypes'),
              anchorHash: t('package.core.activityDetails.votingProcedureTitles.anchorHash'),
              anchorURL: t('package.core.activityDetails.votingProcedureTitles.proposalTxHash')
            }}
            withSeparatorLine
          />
        )}
        {proposalProcedures?.length > 0 && (
          <TxDetailList<TxDetailsProposalProceduresTitles>
            testId="proposal-procedures"
            title={t('package.core.activityDetails.proposalProcedures')}
            subTitle={t('package.core.activityDetails.proposalProcedure')}
            lists={translatedProposalProcedures}
            withSeparatorLine
            translations={{
              type: t('package.core.activityDetails.proposalProcedureTitles.type'),
              deposit: t('package.core.activityDetails.proposalProcedureTitles.deposit'),
              anchorHash: t('package.core.activityDetails.proposalProcedureTitles.anchorHash'),
              anchorURL: t('package.core.activityDetails.proposalProcedureTitles.anchorURL'),
              governanceActionIndex: t('package.core.activityDetails.proposalProcedureTitles.governanceActionIndex'),
              withdrawal: t('package.core.activityDetails.proposalProcedureTitles.withdrawal'),
              withdrawalRewardAccount: t(
                'package.core.activityDetails.proposalProcedureTitles.withdrawalRewardAccount'
              ),
              withdrawalAmount: t('package.core.activityDetails.proposalProcedureTitles.withdrawalAmount'),
              constitutionAnchorURL: t('package.core.activityDetails.proposalProcedureTitles.constitutionAnchorURL'),
              constitutionScriptHash: t('package.core.activityDetails.proposalProcedureTitles.constitutionScriptHash'),
              coldCredentialHash: t('package.core.activityDetails.proposalProcedureTitles.coldCredentialHash'),
              epoch: t('package.core.activityDetails.proposalProcedureTitles.epoch'),
              membersToBeAdded: t('package.core.activityDetails.proposalProcedureTitles.membersToBeAdded'),
              hash: t('package.core.activityDetails.proposalProcedureTitles.hash'),
              membersToBeRemoved: t('package.core.activityDetails.proposalProcedureTitles.membersToBeRemoved'),
              protocolVersionMajor: t('package.core.activityDetails.proposalProcedureTitles.protocolVersionMajor'),
              protocolVersionMinor: t('package.core.activityDetails.proposalProcedureTitles.protocolVersionMinor'),
              protocolVersionPatch: t('package.core.activityDetails.proposalProcedureTitles.protocolVersionPatch')
            }}
          />
        )}
        {certificates?.length > 0 && (
          <TxDetailList<TxDetailsCertificateTitles>
            title={t('package.core.activityDetails.certificates')}
            subTitle={t('package.core.activityDetails.certificate')}
            testId="certificates"
            lists={translatedCertificates}
            withSeparatorLine
            translations={{
              certificate: t('package.core.activityDetails.certificateTitles.certificate'),
              certificateType: t('package.core.activityDetails.certificateTitles.certificateType'),
              coldCredential: t('package.core.activityDetails.certificateTitles.coldCredential'),
              hotCredential: t('package.core.activityDetails.certificateTitles.hotCredential'),
              stakeKey: t('package.core.activityDetails.certificateTitles.stakeKey'),
              drepId: t('package.core.activityDetails.certificateTitles.drepId'),
              anchorUrl: t('package.core.activityDetails.certificateTitles.anchorUrl'),
              anchorHash: t('package.core.activityDetails.certificateTitles.anchorHash'),
              poolId: t('package.core.activityDetails.certificateTitles.poolId'),
              drep: t('package.core.activityDetails.certificateTitles.drep'),
              depositPaid: t('package.core.activityDetails.certificateTitles.depositPaid'),
              depositPaidInfo: t('package.core.activityDetails.certificateTitles.depositPaidInfo')
            }}
          />
        )}
        {addrInputs?.length > 0 && (
          <TransactionInputOutput
            amountTransformer={amountTransformer}
            title={t('package.core.activityDetails.inputs')}
            testId="tx-inputs"
            list={addrInputs}
            translations={{
              address: t('package.core.activityDetails.address'),
              sent: t('package.core.activityDetails.sent')
            }}
            coinSymbol={coinSymbol}
            withSeparatorLine
            sendAnalytics={sendAnalyticsInputs}
          />
        )}
        {addrOutputs?.length > 0 && (
          <TransactionInputOutput
            amountTransformer={amountTransformer}
            title={t('package.core.activityDetails.outputs')}
            testId="tx-outputs"
            list={addrOutputs}
            translations={{
              address: t('package.core.activityDetails.address'),
              sent: t('package.core.activityDetails.sent')
            }}
            coinSymbol={coinSymbol}
            sendAnalytics={sendAnalyticsOutputs}
          />
        )}
        {metadata?.length > 0 && (
          <div className={styles.metadataContainer}>
            <div className={styles.metadataLabel}>{t('package.core.activityDetails.metadata')}</div>
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
    </div>
  );
};
