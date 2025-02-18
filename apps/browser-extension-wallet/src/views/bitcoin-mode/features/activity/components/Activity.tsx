import React, { useMemo, useEffect, useState } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { useFetchCoinPrice, useWalletManager } from '@hooks';
import { GroupedAssetActivityList } from './GroupedAssetActivityList';
import { ActivityStatus, TransactionActivityType } from './AssetActivityItem';
import styles from './Activity.module.scss';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { BitcoinWallet } from '@lace/bitcoin/';
import isEqual from 'lodash/isEqual';
import dayjs from "dayjs";
import { formatDate, formatTime } from "@utils/format-date";
import BigNumber from "bignumber.js";
import { config } from '@src/config';

const formattedDate = (date: Date)=> (dayjs().isSame(date, 'day')
  ? 'Today'
  : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' }));

const formattedTimestamp = (date: Date) => (formatTime({
  date,
  type: 'local'
}));

const SATS_IN_BTC = 100000000;

export const Activity = (): React.ReactElement => {
  const { t } = useTranslation();
  const layoutTitle = `${t('browserView.activity.title')}`;

  const { MEMPOOL_URLS } = config();
  const { bitcoinWallet } = useWalletManager();
  const { priceResult } = useFetchCoinPrice();
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);

  const [recentTransactions, setRecentTransactions] = useState<BitcoinWallet.TransactionHistoryEntry[]>([]);
  const [addresses, setAddresses] = useState<BitcoinWallet.DerivedAddress[]>([]);
  const [explorerBaseUrl, setExplorerBaseUrl] = useState<string>('');

  useEffect( () => {
    // TODO: Make into an observable
    bitcoinWallet.getNetwork().then((network) => {
      if (network === BitcoinWallet.Network.Mainnet) {
        setExplorerBaseUrl(MEMPOOL_URLS.Mainnet);
      } else {
        setExplorerBaseUrl(MEMPOOL_URLS.Testnet4);
      }
    });
  }, [bitcoinWallet]);

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

    const walletAddress = addresses[0].address;

    const groups = recentTransactions.reduce((acc, transaction) => {
      const dateKey = formattedDate(new Date(transaction.timestamp * 1000));
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {} as { [date: string]: BitcoinWallet.TransactionHistoryEntry[] });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateKey) => {
      const transactionsForDay = groups[dateKey];

      const items = transactionsForDay.map((transaction) => {
        const outgoing = transaction.inputs
          .filter((input) => input.address === walletAddress)
          .reduce((acc, input) => acc + BigInt(input.satoshis), BigInt(0));

        const incoming = transaction.outputs
          .filter((output) => output.address === walletAddress)
          .reduce((acc, output) => acc + BigInt(output.satoshis), BigInt(0));

        const net = incoming - outgoing;

        return {
          id: transaction.transactionHash,
          formattedTimestamp: transaction.status === BitcoinWallet.TransactionStatus.Pending
          ? 'PENDING'
          : formattedTimestamp(new Date(transaction.timestamp * 1000)),
          amount: `${new BigNumber(net.toString()).dividedBy(100000000).toFixed(8, BigNumber.ROUND_HALF_UP)} BTC`,
          fiatAmount: `${(new BigNumber((Number(net) / SATS_IN_BTC) * bitcoinPrice).toFixed(2, BigNumber.ROUND_HALF_UP))} USD`,
          status:
            transaction.status === BitcoinWallet.TransactionStatus.Pending
              ? ActivityStatus.PENDING
              : ActivityStatus.SUCCESS,
          type:
            net >= BigInt(0)
              ? TransactionActivityType.incoming
              : TransactionActivityType.outgoing,
          onClick: () => {
            window.open(`${explorerBaseUrl}/${transaction.transactionHash}`, '_blank');
          },
        };
      });

      return {
        title: dateKey,
        popupView: true,
        items,
      };
    });
  }, [addresses, recentTransactions, bitcoinPrice, explorerBaseUrl]);

  const isLoading = addresses.length === 0 || explorerBaseUrl.length === 0;
  const hasActivities = walletActivities.length > 0;

  return (
    <ContentLayout title={layoutTitle} titleSideText="(Recent)" isLoading={isLoading}>
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
