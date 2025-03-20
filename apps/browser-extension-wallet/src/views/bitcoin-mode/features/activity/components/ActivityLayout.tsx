/* eslint-disable promise/catch-or-return, sonarjs/cognitive-complexity, no-magic-numbers,  */
import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchCoinPrice, useWalletManager } from '@hooks';
import { GroupedAssetActivityList } from './GroupedAssetActivityList';
import { ActivityStatus, TransactionActivityType } from './AssetActivityItem';
import styles from './Activity.module.scss';
import { FundWalletBanner, EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import { Bitcoin } from '@lace/bitcoin/';
import isEqual from 'lodash/isEqual';
import dayjs from 'dayjs';
import { formatDate, formatTime } from '@utils/format-date';
import BigNumber from 'bignumber.js';
import { config } from '@src/config';
import { SectionTitle } from '@components/Layout/SectionTitle';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';

const formattedDate = (date: Date) =>
  dayjs().isSame(date, 'day') ? 'Today' : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' });

const formattedTimestamp = (date: Date) =>
  formatTime({
    date,
    type: 'local'
  });

const SATS_IN_BTC = 100_000_000;

export const ActivityLayout = (): React.ReactElement => {
  const { t } = useTranslation();
  const { MEMPOOL_URLS } = config();
  const { bitcoinWallet } = useWalletManager();
  const { priceResult } = useFetchCoinPrice();
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);

  const [recentTransactions, setRecentTransactions] = useState<Bitcoin.TransactionHistoryEntry[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<Bitcoin.TransactionHistoryEntry[]>([]);
  const [addresses, setAddresses] = useState<Bitcoin.DerivedAddress[]>([]);
  const [explorerBaseUrl, setExplorerBaseUrl] = useState<string>('');

  useEffect(() => {
    // TODO: Make into an observable
    bitcoinWallet.getNetwork().then((network) => {
      if (network === Bitcoin.Network.Mainnet) {
        setExplorerBaseUrl(MEMPOOL_URLS.Mainnet);
      } else {
        setExplorerBaseUrl(MEMPOOL_URLS.Testnet4);
      }
    });
  }, [bitcoinWallet, MEMPOOL_URLS]);

  useEffect(() => {
    const subscription = bitcoinWallet.transactionHistory$.subscribe((newTransactions) => {
      setRecentTransactions((prev) => (isEqual(prev, newTransactions) ? prev : newTransactions));
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  useEffect(() => {
    const subscription = bitcoinWallet.pendingTransactions$.subscribe((pendingTransactions) => {
      setPendingTransaction((prev) => (isEqual(prev, pendingTransactions) ? prev : pendingTransactions));
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  useEffect(() => {
    const subscription = bitcoinWallet.addresses$.subscribe((newAddresses) => {
      setAddresses((prev) => (isEqual(prev, newAddresses) ? prev : newAddresses));
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet]);

  const walletActivities = useMemo(() => {
    if (addresses.length === 0 || (recentTransactions.length === 0 && pendingTransaction.length === 0)) return [];

    const walletAddress = addresses[0].address;

    const groups = [...recentTransactions, ...pendingTransaction].reduce((acc, transaction) => {
      const dateKey = transaction.timestamp === 0 ? 'Pending' : formattedDate(new Date(transaction.timestamp * 1000));
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {} as { [date: string]: Bitcoin.TransactionHistoryEntry[] });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Pending') return -1;
      if (b === 'Pending') return 1;

      if (a === 'Today') return -1;
      if (b === 'Today') return 1;

      return new Date(b).getUTCSeconds() - new Date(a).getUTCSeconds();
    });

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
          formattedTimestamp:
            transaction.status === Bitcoin.TransactionStatus.Pending
              ? 'PENDING'
              : formattedTimestamp(new Date(transaction.timestamp * 1000)),
          amount: `${new BigNumber(net.toString()).dividedBy(100_000_000).toFixed(8, BigNumber.ROUND_HALF_UP)} BTC`,
          fiatAmount: `${new BigNumber((Number(net) / SATS_IN_BTC) * bitcoinPrice).toFixed(
            2,
            BigNumber.ROUND_HALF_UP
          )} USD`,
          status:
            transaction.status === Bitcoin.TransactionStatus.Pending ? ActivityStatus.PENDING : ActivityStatus.SUCCESS,
          type: net >= BigInt(0) ? TransactionActivityType.incoming : TransactionActivityType.outgoing,
          onClick: () => {
            window.open(`${explorerBaseUrl}/${transaction.transactionHash}`, '_blank');
          }
        };
      });

      return {
        title: dateKey,
        popupView: true,
        items
      };
    });
  }, [addresses, recentTransactions, bitcoinPrice, explorerBaseUrl, pendingTransaction]);

  const isLoading = addresses.length === 0 || explorerBaseUrl.length === 0;
  const hasActivities = walletActivities.length > 0;

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const educationalList = [
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatAreActivityDetails'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=activity`
    },
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatIsAnUnconfirmedTransaction'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=unconfirmed-transaction`
    },
    {
      title: titles.faq,
      subtitle: t('browserView.activity.learnAbout.doesLaceHaveFees'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=does-lace-have-fees`
    },
    {
      title: titles.video,
      subtitle: t('browserView.activity.learnAbout.transactionBundles'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=lace-introduces-transaction-bundles`
    }
  ];

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={<EducationalList items={educationalList} title={t('browserView.sidePanel.learnAbout')} />}
      >
        <SectionTitle title={t('browserView.activity.title')} />
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
      </SectionLayout>
    </Layout>
  );
};
