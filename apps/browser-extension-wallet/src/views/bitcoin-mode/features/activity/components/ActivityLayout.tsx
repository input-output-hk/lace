/* eslint-disable promise/catch-or-return, sonarjs/cognitive-complexity, no-magic-numbers, unicorn/no-null */
import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchCoinPrice, useWalletManager } from '@hooks';
import { GroupedAssetActivityList } from '@lace/core';
import { ActivityStatus, TransactionActivityType } from './AssetActivityItem';
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
import { useCurrencyStore } from '@providers';
import { useWalletStore } from '@stores';
import debounce from 'lodash/debounce';
import { LACE_APP_ID } from '@utils/constants';
import { Skeleton } from 'antd';
import { updateTransactions } from './Activity';
import uniqBy from 'lodash/uniqBy';

const formattedDate = (date: Date) =>
  dayjs().isSame(date, 'day') ? 'Today' : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' });

const formattedTimestamp = (date: Date) =>
  formatTime({
    date,
    type: 'local'
  });

const SATS_IN_BTC = 100_000_000;

const computeBalance = (totalBalance: number, fiatCurrency: string, bitcoinPrice: number): string => {
  if (fiatCurrency === 'ADA') {
    return totalBalance.toFixed(8);
  }

  return new BigNumber((totalBalance * bitcoinPrice).toString()).toFixed(2, BigNumber.ROUND_HALF_UP);
};

const loadMoreDebounce = 300;

export const ActivityLayout = (): React.ReactElement => {
  const { t } = useTranslation();
  const { MEMPOOL_URLS } = config();
  const { bitcoinWallet } = useWalletManager();
  const { bitcoinBlockchainProvider } = useWalletStore();
  const { priceResult } = useFetchCoinPrice();
  const bitcoinPrice = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const { fiatCurrency } = useCurrencyStore();

  const [recentTransactions, setRecentTransactions] = useState<Bitcoin.TransactionHistoryEntry[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<Bitcoin.TransactionHistoryEntry[]>([]);
  const [addresses, setAddresses] = useState<Bitcoin.DerivedAddress[]>([]);
  const [explorerBaseUrl, setExplorerBaseUrl] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [loadedTxLength, setLoadedTxLength] = useState<number>(0);
  const [mightHaveMore, setMightHaveMore] = useState<boolean>(false);
  const [activityFetched, setActivityFetched] = useState<boolean>(false);
  const [currentCursor, setCurrentCursor] = useState<string | null>('');
  const debouncedLoadMore = useMemo(
    () =>
      debounce(() => {
        if (mightHaveMore && addresses.length > 0) {
          void bitcoinBlockchainProvider
            .getTransactions(addresses[0].address, 0, 20, currentCursor ?? undefined)
            .then(({ transactions, nextCursor }) => {
              setRecentTransactions((prev) => updateTransactions(prev, transactions));
              setCurrentCursor(nextCursor);
              setMightHaveMore(nextCursor && nextCursor !== '');
              setLoadedTxLength((prev) => prev + transactions.length);
            })
            .catch((error_) => {
              setError(error_);
            });
        }
      }, loadMoreDebounce),
    [bitcoinBlockchainProvider, addresses, currentCursor, mightHaveMore]
  );

  useEffect(() => {
    // TODO: Make into an observable
    bitcoinWallet.getNetwork().then((network) => {
      if (network === Bitcoin.Network.Mainnet) {
        setExplorerBaseUrl(MEMPOOL_URLS.Mainnet);
      } else {
        setExplorerBaseUrl(MEMPOOL_URLS.Testnet4);
      }
    });
  }, [bitcoinWallet, MEMPOOL_URLS.Mainnet, MEMPOOL_URLS.Testnet4]);

  useEffect(() => {
    const subscription = bitcoinWallet.transactionHistory$.subscribe((newTransactions) => {
      setRecentTransactions((prev) => updateTransactions(prev, newTransactions));
      setMightHaveMore(newTransactions.length >= 20);
      setActivityFetched(true);
    });
    return () => subscription.unsubscribe();
  }, [bitcoinWallet, setMightHaveMore, setActivityFetched]);

  useEffect(() => {
    const subscription = bitcoinWallet.pendingTransactions$.subscribe((pendingTransactions) => {
      setPendingTransaction(uniqBy(pendingTransactions, 'transactionHash'));
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

        const outgoingToForeign = transaction.outputs.filter((output) => output.address !== walletAddress);

        const isSelf = incoming > 0 && outgoingToForeign.length === 0;

        const net = incoming - outgoing;
        let type = net >= BigInt(0) ? TransactionActivityType.incoming : TransactionActivityType.outgoing;
        if (isSelf) {
          type = TransactionActivityType.self;
        }

        return {
          id: transaction.transactionHash,
          formattedTimestamp:
            transaction.status === Bitcoin.TransactionStatus.Pending
              ? 'PENDING'
              : formattedTimestamp(new Date(transaction.timestamp * 1000)),
          amount: `${new BigNumber(net.toString()).dividedBy(100_000_000).toFixed(8, BigNumber.ROUND_HALF_UP)} BTC`,
          fiatAmount: `${computeBalance(Number(net) / SATS_IN_BTC, fiatCurrency.code, bitcoinPrice)} ${
            fiatCurrency.code === 'ADA' ? 'BTC' : fiatCurrency.code
          }`,
          status:
            transaction.status === Bitcoin.TransactionStatus.Pending ? ActivityStatus.PENDING : ActivityStatus.SUCCESS,
          type,
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
  }, [addresses, recentTransactions, bitcoinPrice, explorerBaseUrl, pendingTransaction, fiatCurrency]);

  const isLoading =
    addresses.length === 0 || explorerBaseUrl.length === 0 || currentCursor === null || !activityFetched;
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
        <Skeleton loading={isLoading}>
          {hasActivities && (
            <GroupedAssetActivityList
              hasMore={mightHaveMore}
              loadMore={debouncedLoadMore}
              lists={walletActivities}
              scrollableTarget={LACE_APP_ID}
              dataLength={loadedTxLength}
              loadingError={error}
              retryLoading={debouncedLoadMore}
            />
          )}
          {!hasActivities && (
            <FundWalletBanner
              title={t('browserView.activity.fundWalletBanner.title')}
              subtitle={t('browserView.activity.fundWalletBanner.subtitle')}
              prompt={t('browserView.fundWalletBanner.prompt')}
              walletAddress={isLoading ? '' : addresses[0].address}
              shouldHaveVerticalContent
            />
          )}
        </Skeleton>
      </SectionLayout>
    </Layout>
  );
};
