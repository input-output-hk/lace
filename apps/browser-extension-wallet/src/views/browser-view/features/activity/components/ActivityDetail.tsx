/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { Skeleton } from 'antd';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';
import { AssetActivityListProps, ActivityDetailBrowser, ActivityStatus, TxOutputInput, TxSummary } from '@lace/core';
import { PriceResult } from '@hooks';
import { useWalletStore } from '@stores';
import { ActivityDetail as ActivityDetailType } from '@src/types';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useAnalyticsContext, useCurrencyStore, useExternalLinkOpener } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const MAX_SUMMARY_ADDRESSES = 5;

export type AddressListType = {
  id: number;
  name: string;
  address: string;
};

export const getTransactionData = ({
  addrOutputs,
  addrInputs,
  walletAddresses,
  isIncomingTransaction
}: {
  addrOutputs: TxOutputInput[];
  addrInputs: TxOutputInput[];
  walletAddresses: string[];
  isIncomingTransaction: boolean;
}): TxSummary[] => {
  if (!addrOutputs || !addrInputs || !walletAddresses) {
    return [];
  }

  // For incomming type of tx the sender addresses will be all addresses available in activityInfo?.tx.addrInputs list (except the current one)
  if (isIncomingTransaction) {
    const outputData = addrOutputs.filter((input) => walletAddresses.includes(input.addr));
    const addrs = uniq(
      flatMap(addrInputs, (input) => (!walletAddresses.includes(input.addr) ? [input.addr] : []))
    ) as string[];

    return outputData.map((output) => ({
      ...output,
      // Show up to 5 addresses below multiple addresses (see LW-4040)
      addr: addrs.slice(0, MAX_SUMMARY_ADDRESSES)
    }));
  }

  // For outgoing/sent type of tx the receiver addresses will be all addresses available in activityInfo?.tx.addrOutputs list (except the current one)
  return addrOutputs
    .filter((output) => !walletAddresses.includes(output.addr))
    .map((output) => ({
      ...output,
      ...(!Array.isArray(output.addr) && { addr: [output.addr] })
    }));
};

const getCurrentTransactionStatus = (
  activities: AssetActivityListProps[],
  txId: Wallet.Cardano.TransactionId
): ActivityStatus | undefined => {
  const todayActivity = activities.find((activity) => activity.title === 'Today');
  const transaction = todayActivity?.items.find((item) => item.id === String(txId));
  return transaction?.status;
};

interface ActivityDetailProps {
  price: PriceResult;
}

export const ActivityDetail = withAddressBookContext<ActivityDetailProps>(({ price }): ReactElement => {
  const {
    walletInfo,
    walletUI: { cardanoCoin, appMode },
    environmentName
  } = useWalletStore();
  const isPopupView = appMode === APP_MODE_POPUP;
  const { getActivityDetail, activityDetail, fetchingActivityInfo, walletActivities } = useWalletStore();
  const [activityInfo, setActivityInfo] = useState<ActivityDetailType>();
  const { fiatCurrency } = useCurrencyStore();
  const { list: addressList } = useAddressBookContext();
  const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();
  const openExternalLink = useExternalLinkOpener();
  const analytics = useAnalyticsContext();

  const explorerBaseUrl = useMemo(
    () => `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`,
    [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName]
  );

  const currentTransactionStatus = useMemo(
    () =>
      activityDetail.tx?.id
        ? getCurrentTransactionStatus(walletActivities, activityDetail.tx.id) ?? activityInfo?.status
        : activityInfo?.status,
    [activityDetail.tx?.id, activityInfo?.status, walletActivities]
  );

  const fetchActivityInfo = useCallback(async () => {
    const result = await getActivityDetail({ coinPrices: price, fiatCurrency });
    setActivityInfo(result);
  }, [getActivityDetail, setActivityInfo, price, fiatCurrency]);

  useEffect(() => {
    fetchActivityInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addressToNameMap = useMemo(
    () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
    [addressList]
  );

  const isIncomingTransaction = activityDetail.direction === 'Incoming';
  const { addrOutputs, addrInputs } = activityInfo?.tx || {};
  const txSummary = useMemo(
    () =>
      getTransactionData({
        addrOutputs,
        addrInputs,
        walletAddresses: walletInfo.addresses.map((addr) => addr.address.toString()),
        isIncomingTransaction
      }),
    [isIncomingTransaction, addrOutputs, addrInputs, walletInfo.addresses]
  );

  if (fetchingActivityInfo || !activityInfo) return <Skeleton data-testid="transaction-details-skeleton" />;

  const getHeaderDescription = () => {
    if (activityInfo.type === 'rewards') return '';
    if (activityInfo.type === 'delegation') return '1 token';
    return ` (${activityInfo?.assetAmount})`;
  };

  const handleOpenExternalLink = () => {
    analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailTransactionHashClick);
    const externalLink = `${explorerBaseUrl}/${activityInfo.tx.hash}`;
    externalLink && currentTransactionStatus === 'success' && openExternalLink(externalLink);
  };

  return (
    <ActivityDetailBrowser
      hash={activityInfo.tx.hash}
      status={currentTransactionStatus}
      includedDate={activityInfo.tx.includedUtcDate}
      includedTime={activityInfo.tx.includedUtcTime}
      addrInputs={activityInfo.tx.addrInputs}
      addrOutputs={activityInfo.tx.addrOutputs}
      fee={activityInfo.tx.fee}
      pools={activityInfo.tx.pools}
      deposit={activityInfo.tx.deposit}
      depositReclaim={activityInfo.tx.depositReclaim}
      metadata={activityInfo.tx.metadata}
      amountTransformer={(ada: string) =>
        `${Wallet.util.convertAdaToFiat({ ada, fiat: price?.cardano?.price })} ${fiatCurrency?.code}`
      }
      headerDescription={getHeaderDescription() || cardanoCoin.symbol}
      txSummary={txSummary}
      addressToNameMap={addressToNameMap}
      coinSymbol={cardanoCoin.symbol}
      rewards={activityInfo.tx?.rewards}
      type={activityInfo?.type}
      isPopupView={isPopupView}
      openExternalLink={handleOpenExternalLink}
      sendAnalyticsInputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailInputsClick)}
      sendAnalyticsOutputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailOutputsClick)}
    />
  );
});
