import React, { useMemo, useEffect, useState } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { useWalletManager } from '@hooks';
import { GroupedAssetActivityList } from './GroupedAssetActivityList';
import { ActivityStatus, TransactionActivityType } from './AssetActivityItem';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { BitcoinWallet } from '@lace/bitcoin/';
import isEqual from 'lodash/isEqual';

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
  const layoutTitle = `${t('browserView.activity.title')}`;

  console.error('re-render');

  const { bitcoinWallet } = useWalletManager();

  const [recentTransactions, setRecentTransactions] = useState<BitcoinWallet.TransactionHistoryEntry[]>([]);
  const [addresses, setAddresses] = useState<BitcoinWallet.DerivedAddress[]>([]);

  useEffect(() => {
    const subscription = bitcoinWallet.transactionHistory$.subscribe((newTransactions) => {
      setRecentTransactions((prev) =>
        isEqual(prev, newTransactions) ? prev : newTransactions
      );
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  useEffect(() => {
    const subscription = bitcoinWallet.addresses$.subscribe((newAddresses) => {
      setAddresses((prev) =>
        isEqual(prev, newAddresses) ? prev : newAddresses
      );
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  const walletActivities = useMemo(() => {
    if (addresses.length === 0 || recentTransactions.length === 0) return [];

    return [
      {
        popupView: true,
        items: recentTransactions.map((transaction) => {
          const outgoing = transaction.inputs
            .filter((input) => input.address === addresses[0].address)
            .reduce((acc, input) => acc + BigInt(input.satoshis), BigInt(0));

          const incoming = transaction.outputs
            .filter((output) => output.address === addresses[0].address)
            .reduce((acc, output) => acc + BigInt(output.satoshis), BigInt(0));

          const net = incoming - outgoing;

          return {
            id: transaction.transactionHash,
            formattedTimestamp: transaction.timestamp.toString(),
            amount: net.toString(),
            fiatAmount: '0',
            status:
              transaction.status === BitcoinWallet.TransactionStatus.Pending
                ? ActivityStatus.PENDING
                : ActivityStatus.SUCCESS,
            type:
              net >= BigInt(0)
                ? TransactionActivityType.incoming
                : TransactionActivityType.outgoing,
          };
        }),
      },
    ];
  }, [addresses, recentTransactions]);

  const isLoading = addresses.length === 0;
  const hasActivities = walletActivities.length > 0;

  console.error('walletActivities', walletActivities);
  console.error('addresses', addresses);

  return (
    <ContentLayout title={layoutTitle} titleSideText="(0)" isLoading={isLoading}>
      <div className={styles.activitiesContainer}>
        {hasActivities ? (
          <GroupedAssetActivityList
            lists={walletActivities}
            infiniteScrollProps={{ scrollableTarget: 'contentLayout' }}
          />
        ) : (
          <div className={styles.emptyState}>
            <FundWalletBanner
              title={t('browserView.assets.welcome')}
              subtitle={t('browserView.activity.fundWalletBanner.title')}
              prompt={t('browserView.fundWalletBanner.prompt')}
              walletAddress={isLoading ? '' : addresses[0].address}
            />
          </div>
        )}
      </div>
    </ContentLayout>
  );
};
