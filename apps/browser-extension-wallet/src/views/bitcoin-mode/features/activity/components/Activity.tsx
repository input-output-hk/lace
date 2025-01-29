import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import {useWalletManager} from '@hooks';
import { GroupedAssetActivityList } from './GroupedAssetActivityList';
import { ActivityStatus, TransactionActivityType } from './AssetActivityItem';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { useObservable } from "@lace/common";
import { BitcoinWallet } from "@lace/bitcoin/";

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
 // const { priceResult } = useFetchCoinPrice();
  //const bitcoinPrice = useMemo(() => 0, []);
  const layoutTitle = `${t('browserView.activity.title')}`;
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  console.error('re-render');
  const { bitcoinWallet } = useWalletManager();
  const recentTransactions = useObservable(bitcoinWallet.transactionHistory$, []);
  //const recentTransactions = useMemo(() => [...rawTransactions], []);

  const walletActivities = useMemo(() => {
    if (!walletAddress) return [];

    const items = recentTransactions.map((transaction) => {
      const outgoing = transaction.inputs
        .filter((input) => input.address === walletAddress)
        .reduce((acc, input) => acc + BigInt(input.satoshis), BigInt(0));

      const incoming = transaction.outputs
        .filter((output) => output.address === walletAddress)
        .reduce((acc, output) => acc + BigInt(output.satoshis), BigInt(0));

      const net = incoming - outgoing;

      return {
        id: transaction.transactionHash,
        formattedTimestamp: transaction.timestamp.toString(),
        amount: net.toString(),
        fiatAmount: '0',
        status: transaction.status === BitcoinWallet.TransactionStatus.Pending ? ActivityStatus.PENDING : ActivityStatus.SUCCESS,
        type: net >= BigInt(0) ? TransactionActivityType.incoming : TransactionActivityType.outgoing,
      };
    });

    return [{ popupView: true, items }];
  }, [recentTransactions, walletAddress]);

  const fetchWalletAddress = useCallback(async () => {
    try {
      const address = await bitcoinWallet.getAddress();
      console.error(`address: ${address.address}`);
      setWalletAddress(address.address);
    } catch (error) {
      console.error('Failed to fetch wallet address:', error);
    }
  }, []);

  useEffect(() => {
    fetchWalletAddress();
  }, []);

  const layoutSideText = `(0)`;
  const hasActivities = useMemo(() => walletActivities.length > 0, [walletActivities]);
  const isLoading = false;

  console.error('walletActivities', walletActivities);
  return (
    <ContentLayout title={layoutTitle} titleSideText={layoutSideText} isLoading={isLoading}>
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
              walletAddress={walletAddress}
            />
          </div>
        )}
      </div>
    </ContentLayout>
  );
};
