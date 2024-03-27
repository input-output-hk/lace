/* eslint-disable no-console */
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
import { Collateral, CollateralStatus } from './Collateral';

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
  addressToNameMap: Map<string, string>;
  isPopupView?: boolean;
  openExternalLink?: (url: string) => void;
  handleOpenExternalHashLink?: () => void;
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
  handleOpenExternalHashLink,
  sendAnalyticsInputs,
  sendAnalyticsOutputs,
  proposalProcedures,
  votingProcedures,
  certificates,
  collateral
}: TransactionDetailsProps): React.ReactElement => {
  const { t } = useTranslate();

  const isSending = status === ActivityStatus.PENDING;
  const isSuccess = status === ActivityStatus.SUCCESS;

  const renderAnchorHashDetails = (url: string) => (
    <div className={styles.txLink} onClick={() => openExternalLink(url)}>
      {url}
    </div>
  );

  // Translate certificate typenames
  // TODO: refactor this one
  const translatedCertificates = certificates?.map((certificate) =>
    certificate?.map(
      (detail) =>
        ({
          ...detail,
          ...('title' in detail &&
            detail.title === 'certificateType' && {
              details: [t(`package.core.assetActivityItem.entry.name.${detail.details[0]}`)]
            }),
          ...('title' in detail &&
            detail.title === 'anchorURL' && {
              details: [renderAnchorHashDetails(detail.details[0] as string)]
            })
        } as unknown as TxDetail<TxDetailsCertificateTitles>)
    )
  );

  // Translate governance proposal typenames
  // TODO: find a way to translate in the mappers
  // TODO: refactor this one
  const translatedProposalProcedures = proposalProcedures?.map((proposal) =>
    proposal?.map(
      (p) =>
        ({
          ...p,
          ...('title' in p &&
            p.title === 'type' && {
              details: [t(`package.core.activityDetails.governanceActions.${p.details[0]}`)]
            }),
          ...('title' in p &&
            p.title === 'anchorURL' && {
              details: [renderAnchorHashDetails(p.details[0] as string)]
            }),
          ...('header' in p && {
            details: p.details.map((detail) => ({
              ...detail,
              ...('title' in detail &&
                ['govActionLifetime', 'drepActivity', 'ccMaxTermLength'].includes(detail.title) && {
                  details: [
                    `
                    ${Number(detail.details[0])}
                      ${t(
                        // eslint-disable-next-line sonarjs/no-nested-template-literals
                        `package.core.activityDetails.${
                          Number(detail.details[0]) === 0 || Number(detail.details[0]) > 1 ? 'epochs' : 'epoch'
                        }`
                      )}
                    `
                  ]
                }),
              ...('title' in detail &&
                detail.title === 'anchorURL' && {
                  details: [renderAnchorHashDetails(detail.details[0] as string)]
                })
            }))
          })
        } as unknown as TxDetail<TxDetailsProposalProceduresTitles>)
    )
  );

  // Translate voting procedure typenames
  // TODO: refactor this one
  const translatedVotingProcedures = votingProcedures?.map((proposal) =>
    proposal?.map(
      (p) =>
        ({
          ...p,
          ...('title' in p &&
            ['voterType', 'voteTypes'].includes(p.title) && {
              details: [t(`package.core.activityDetails.${p.title}.${p.details[0]}`)]
            }),
          ...('title' in p &&
            p.title === 'anchorURL' && {
              details: [renderAnchorHashDetails(p.details[0] as string)]
            })
        } as unknown as TxDetail<TxDetailsVotingProceduresTitles>)
    )
  );

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
                [styles.hash]: handleOpenExternalHashLink,
                [styles.txLink]: isSuccess && !!handleOpenExternalHashLink
              })}
              onClick={handleOpenExternalHashLink}
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
                tooltipInfo={t('package.core.activityDetails.transactionFeeInfo')}
                fee={fee}
                amountTransformer={amountTransformer}
                coinSymbol={coinSymbol}
              />
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
              drepId: t('package.core.activityDetails.votingProcedureTitles.drepId'),
              voterCredential: t('package.core.activityDetails.votingProcedureTitles.voterCredential'),
              voteTypes: t('package.core.activityDetails.votingProcedureTitles.voteTypes'),
              anchorHash: t('package.core.activityDetails.votingProcedureTitles.anchorHash'),
              anchorURL: t('package.core.activityDetails.votingProcedureTitles.anchorURL')
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
              rewardAccount: t('package.core.activityDetails.proposalProcedureTitles.rewardAccount'),
              anchorHash: t('package.core.activityDetails.proposalProcedureTitles.anchorHash'),
              anchorURL: t('package.core.activityDetails.proposalProcedureTitles.anchorURL'),
              governanceActionID: t('package.core.activityDetails.proposalProcedureTitles.governanceActionID'),
              actionIndex: t('package.core.activityDetails.proposalProcedureTitles.actionIndex'),
              newQuorumThreshold: t('package.core.activityDetails.proposalProcedureTitles.newQuorumThreshold'),
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
              protocolVersionPatch: t('package.core.activityDetails.proposalProcedureTitles.protocolVersionPatch'),
              maxTxExUnits: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxExUnits'
              ),
              maxBlockExUnits: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBlockExUnits'
              ),
              networkGroup: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.title'),
              economicGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.title'
              ),
              technicalGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.title'
              ),
              costModels: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.costModels'
              ),
              PlutusV1: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.PlutusV1'
              ),
              PlutusV2: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.PlutusV2'
              ),
              governanceGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.title'
              ),
              dRepVotingThresholds: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.title'
              ),
              memory: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.memory'),
              step: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.step'),
              maxBBSize: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBBSize'
              ),
              maxTxSize: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxTxSize'
              ),
              maxBHSize: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxBHSize'
              ),
              maxValSize: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxValSize'
              ),
              maxCollateralInputs: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.networkGroup.maxCollateralInputs'
              ),
              minFeeA: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeA'),
              minFeeB: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minFeeB'),
              keyDeposit: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.keyDeposit'
              ),
              poolDeposit: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.poolDeposit'
              ),
              rho: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.rho'),
              tau: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.tau'),
              minPoolCost: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.minPoolCost'
              ),
              coinsPerUTxOByte: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.coinsPerUTxOByte'
              ),
              a0: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.a0'),
              eMax: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.eMax'),
              nOpt: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.nOpt'),
              collateralPercentage: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.technicalGroup.collateralPercentage'
              ),
              prices: t('package.core.ProposalProcedure.governanceAction.protocolParamUpdate.economicGroup.prices'),
              govActionLifetime: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionLifetime'
              ),
              govActionDeposit: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.govActionDeposit'
              ),
              drepDeposit: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepDeposit'
              ),
              drepActivity: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.drepActivity'
              ),
              ccMinSize: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMinSize'
              ),
              ccMaxTermLength: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.ccMaxTermLength'
              ),
              motionNoConfidence: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.motionNoConfidence'
              ),
              committeeNormal: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNormal'
              ),
              committeeNoConfidence: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.committeeNoConfidence'
              ),
              updateConstitution: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.updateConstitution'
              ),
              hardForkInitiation: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.hardForkInitiation'
              ),
              ppNetworkGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppNetworkGroup'
              ),
              ppEconomicGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppEconomicGroup'
              ),
              ppTechnicalGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppTechnicalGroup'
              ),
              ppGovernanceGroup: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.ppGovernanceGroup'
              ),
              treasuryWithdrawal: t(
                'package.core.ProposalProcedure.governanceAction.protocolParamUpdate.governanceGroup.dRepVotingThresholds.treasuryWithdrawal'
              )
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
              anchorURL: t('package.core.activityDetails.certificateTitles.anchorURL'),
              anchorHash: t('package.core.activityDetails.certificateTitles.anchorHash'),
              poolId: t('package.core.activityDetails.certificateTitles.poolId'),
              drep: t('package.core.activityDetails.certificateTitles.drep'),
              depositPaid: t('package.core.activityDetails.certificateTitles.depositPaid'),
              depositPaidInfo: t('package.core.activityDetails.certificateTitles.depositPaidInfo'),
              depositReturned: t('package.core.activityDetails.certificateTitles.depositReturned'),
              depositReturnedInfo: t('package.core.activityDetails.certificateTitles.depositReturnedInfo')
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
