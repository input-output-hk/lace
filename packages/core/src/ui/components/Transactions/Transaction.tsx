/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import cn from 'classnames';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import styles from './TransactionDetailBrowser.module.scss';
import { TransactionDetailAsset, TxOutputInput, TransactionMetadataProps, TxSummary } from './TransactionDetailAsset';
import { TransactionStatus } from '../Activity';
import { Ellipsis, toast } from '@lace/common';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import { TransactionInputOutput } from './TransactionInputOutput';
import { useTranslate } from '@src/ui/hooks';
import CopyToClipboard from 'react-copy-to-clipboard';
import type { RewardsInfo } from './RewardsInfo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayMetadataMsg = (value: any[]): string => value?.find((val: any) => val.hasOwnProperty('msg'))?.msg || '';

export interface TransactionProps {
  hash?: string;
  name: string;
  status?: TransactionStatus;
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
  rewards?: RewardsInfo;
  addressToNameMap: Map<string, string>;
  isPopupView?: boolean;
  openExternalLink?: () => void;
  sendAnalyticsInputs?: () => void;
  sendAnalyticsOutputs?: () => void;
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
export const Transaction = ({
  hash,
  name,
  status,
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
  sendAnalyticsOutputs
}: TransactionProps): React.ReactElement => {
  const { t } = useTranslate();
  const isSending = status === 'sending';
  const isSuccess = status === 'success';

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
    <div>
      <div className={styles.header} data-testid="tx-header">
        {t('package.core.transactionDetailBrowser.header')}
      </div>
      <div className={styles.block}>
        <div data-testid="tx-hash" className={styles.hashContainer}>
          <div className={cn(styles.title, styles.labelWidth)}>
            <div className={styles.hashLabel}>{t('package.core.transactionDetailBrowser.transactionHash')}</div>
          </div>
          <div
            data-testid="tx-hash-detail"
            className={cn(styles.detail, styles.hash, {
              [styles.txLink]: isSuccess
            })}
            onClick={openExternalLink}
          >
            <div>
              {isSending ? (
                <CopiableHash hash={hash} copiedText={t('package.core.transactionDetailBrowser.copiedToClipboard')} />
              ) : (
                hash
              )}
            </div>
          </div>
        </div>

        <h1 className={styles.summary}>{t('package.core.transactionDetailBrowser.summary')}</h1>
        {pools?.length > 0 && (
          <div className={styles.stakingInfo}>
            <div className={cn(styles.title, styles.poolsTitle)}>
              {t('package.core.transactionDetailBrowser.pools')}
            </div>
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
                {t(`package.core.transactionDetailBrowser.${name.toLowerCase() === 'sent' ? 'to' : 'from'}`)}
              </div>
              <div>
                {summary.addr.length > 1 && (
                  <div data-testid="tx-to-detail-multiple-addresses" className={cn(styles.detail, styles.detailTitle)}>
                    {t('package.core.transactionDetailBrowser.multipleAddresses')}
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
          <div className={styles.title}>{t('package.core.transactionDetailBrowser.status')}</div>
          {status && (
            <div data-testid="tx-status" className={styles.detail}>{`${status.charAt(0).toUpperCase()}${status.slice(
              1
            )}`}</div>
          )}
        </div>
        <div data-testid="tx-date" className={cn(styles.details, styles.timestampContainer)}>
          <div className={cn(styles.title, styles.timestamp)}>
            {t('package.core.transactionDetailBrowser.timestamp')}
          </div>
          <div data-testid="tx-timestamp" className={styles.detail}>
            <span>{includedDate}</span>
            <span>&nbsp;{includedTime}</span>
          </div>
        </div>

        {fee && fee !== '-' && (
          <div className={styles.details}>
            <div className={styles.txFeeContainer}>
              <div className={styles.txfee}>{t('package.core.transactionDetailBrowser.transactionFee')}</div>
              <Tooltip title={t('package.core.transactionDetailBrowser.transactionFeeInfo')}>
                {Info ? (
                  <Info style={{ fontSize: '18px', color: '#8f97a8', cursor: 'pointer' }} />
                ) : (
                  <InfoCircleOutlined />
                )}
              </Tooltip>
            </div>

            <div data-testid="tx-fee" className={styles.detail}>
              <div className={styles.amount}>
                <span data-testid="tx-fee-ada" className={styles.ada}>{`${fee} ${coinSymbol}`}</span>
                <span data-testid="tx-fee-fiat" className={styles.fiat}>
                  {amountTransformer(fee)}
                </span>
              </div>
            </div>
          </div>
        )}

        {deposit &&
          renderDepositValueSection({ value: deposit, label: t('package.core.transactionDetailBrowser.deposit') })}
        {depositReclaim &&
          renderDepositValueSection({
            value: depositReclaim,
            label: t('package.core.transactionDetailBrowser.depositReclaim')
          })}
      </div>

      {addrInputs?.length > 0 && (
        <TransactionInputOutput
          amountTransformer={amountTransformer}
          title={t('package.core.transactionDetailBrowser.inputs')}
          testId="tx-inputs"
          list={addrInputs}
          translations={{
            address: t('package.core.transactionDetailBrowser.address'),
            sent: t('package.core.transactionDetailBrowser.sent')
          }}
          coinSymbol={coinSymbol}
          withSeparatorLine
          sendAnalytics={sendAnalyticsInputs}
        />
      )}
      {addrOutputs?.length > 0 && (
        <TransactionInputOutput
          amountTransformer={amountTransformer}
          title={t('package.core.transactionDetailBrowser.outputs')}
          testId="tx-outputs"
          list={addrOutputs}
          translations={{
            address: t('package.core.transactionDetailBrowser.address'),
            sent: t('package.core.transactionDetailBrowser.sent')
          }}
          coinSymbol={coinSymbol}
          sendAnalytics={sendAnalyticsOutputs}
        />
      )}
      {metadata?.length > 0 && (
        <div className={styles.metadataContainer}>
          <div className={styles.metadataLabel}>{t('package.core.transactionDetailBrowser.metadata')}</div>
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
  );
};
