import React from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { TransactionActivityType, TransactionDetailsProps } from '../ActivityDetail';
import styles from '../ActivityDetail/TransactionDetails.module.scss';
import { Ellipsis } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { getAddressTagTranslations, renderAddressTag } from '@ui/utils';

type TxSummaryProps = Pick<
  TransactionDetailsProps,
  'txSummary' | 'name' | 'amountTransformer' | 'coinSymbol' | 'addressToNameMap' | 'isPopupView' | 'ownAddresses'
>;

export const TxSummarySection = ({
  txSummary,
  name,
  amountTransformer,
  coinSymbol,
  addressToNameMap,
  isPopupView,
  ownAddresses
}: TxSummaryProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      {txSummary?.map((summary, index) => (
        <div key={index.toString()} data-testid="tx-detail-bundle">
          <div className={styles.details}>
            <div className={styles.title} data-testid="tx-sent-title">
              {name}
            </div>
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
                <span className={styles.ada} data-testid="tx-sent-detail-ada">{`${summary.amount} ${coinSymbol}`}</span>{' '}
                <span className={styles.fiat} data-testid="tx-sent-detail-fiat">{`${amountTransformer(
                  summary.amount
                )}`}</span>
              </div>
            </div>
          </div>
          <div className={styles.details}>
            <div className={styles.title} data-testid="tx-to-from-title">
              {t(`core.activityDetails.${summary.type === TransactionActivityType.outgoing ? 'to' : 'from'}`)}
            </div>
            <div>
              {summary.addr.length > 1 && (
                <div data-testid="tx-to-detail-multiple-addresses" className={cn(styles.detail, styles.detailTitle)}>
                  {t('core.activityDetails.multipleAddresses')}
                </div>
              )}
              {(summary.addr as string[]).map((addr) => {
                const addressName = addressToNameMap?.get(addr);
                const address = isPopupView ? (
                  <Ellipsis
                    className={cn(styles.addr, styles.fiat)}
                    text={addr}
                    dataTestId="tx-to-address"
                    ellipsisInTheMiddle
                  />
                ) : (
                  <span className={cn(styles.addr, styles.fiat)} data-testid="tx-to-address">
                    {addr}
                  </span>
                );
                return (
                  <div key={addr} className={cn([styles.detail, styles.addr, styles.addressTag])}>
                    {addressName && <Text.Body.Normal weight="$semibold">{addressName}</Text.Body.Normal>}
                    {<Text.Address color={addressName ? 'secondary' : 'primary'}>{address}</Text.Address>}
                    {renderAddressTag({
                      address: addr,
                      translations: getAddressTagTranslations(t),
                      ownAddresses
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
