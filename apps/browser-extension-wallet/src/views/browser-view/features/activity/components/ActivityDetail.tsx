/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { Skeleton } from 'antd';
import { config } from '@src/config';
import { Wallet } from '@lace/cardano';
import {
  AssetActivityListProps,
  ActivityStatus,
  TxOutputInput,
  TxSummary,
  ActivityType,
  useTranslate,
  RewardsDetails,
  TransactionDetails
} from '@lace/core';
import { PriceResult } from '@hooks';
import { useWalletStore } from '@stores';
import { ActivityDetail as ActivityDetailType, TransactionActivityDetail, TxDirection } from '@src/types';
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

const getTypeLabel = (type: ActivityType, t: ReturnType<typeof useTranslate>['t']) => {
  if (type === 'rewards') return t('package.core.activityDetails.rewards');
  if (type === 'delegation') return t('package.core.activityDetails.delegation');
  if (type === 'delegationRegistration') return t('package.core.activityDetails.registration');
  if (type === 'delegationDeregistration') return t('package.core.activityDetails.deregistration');
  if (type === 'incoming') return t('package.core.activityDetails.received');
  return t('package.core.activityDetails.sent');
};

type TransactionDetailsProxyProps = {
  name: string;
  activityInfo: TransactionActivityDetail;
  direction: TxDirection;
  status: ActivityStatus;
  amountTransformer: (amount: string) => string;
};
const TransactionDetailsProxy = withAddressBookContext(
  ({ name, activityInfo, direction, status, amountTransformer }: TransactionDetailsProxyProps): ReactElement => {
    const analytics = useAnalyticsContext();
    const {
      walletInfo,
      environmentName,
      walletUI: { cardanoCoin, appMode }
    } = useWalletStore();
    const isPopupView = appMode === APP_MODE_POPUP;
    const openExternalLink = useExternalLinkOpener();
    const { list: addressList } = useAddressBookContext();

    const { CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS } = config();
    const explorerBaseUrl = useMemo(
      () => `${CEXPLORER_BASE_URL[environmentName]}/${CEXPLORER_URL_PATHS.Tx}`,
      [CEXPLORER_BASE_URL, CEXPLORER_URL_PATHS.Tx, environmentName]
    );
    const getHeaderDescription = () => {
      if (activityInfo.type === 'delegation') return '1 token';
      return ` (${activityInfo?.assetAmount})`;
    };
    const isIncomingTransaction = direction === 'Incoming';
    const {
      addrOutputs,
      addrInputs,
      hash,
      includedUtcDate,
      includedUtcTime,
      fee,
      pools,
      deposit,
      depositReclaim,
      metadata
    } = activityInfo.activity;
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

    const handleOpenExternalLink = () => {
      analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailTransactionHashClick);
      const externalLink = `${explorerBaseUrl}/${hash}`;
      externalLink && status === 'success' && openExternalLink(externalLink);
    };

    const addressToNameMap = useMemo(
      () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
      [addressList]
    );

    return (
      // eslint-disable-next-line react/jsx-pascal-case
      <TransactionDetails
        name={name}
        hash={hash}
        status={status}
        includedDate={includedUtcDate}
        includedTime={includedUtcTime}
        addrInputs={addrInputs}
        addrOutputs={addrOutputs}
        fee={fee}
        pools={pools}
        deposit={deposit}
        depositReclaim={depositReclaim}
        metadata={metadata}
        amountTransformer={amountTransformer}
        headerDescription={getHeaderDescription() || cardanoCoin.symbol}
        txSummary={txSummary}
        addressToNameMap={addressToNameMap}
        coinSymbol={cardanoCoin.symbol}
        isPopupView={isPopupView}
        openExternalLink={handleOpenExternalLink}
        sendAnalyticsInputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailInputsClick)}
        sendAnalyticsOutputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailOutputsClick)}
      />
    );
  }
);

export const ActivityDetail = ({ price }: ActivityDetailProps): ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { t } = useTranslate();
  const { getActivityDetail, activityDetail, fetchingActivityInfo, walletActivities } = useWalletStore();
  const [activityInfo, setActivityInfo] = useState<ActivityDetailType>();
  const { fiatCurrency } = useCurrencyStore();

  const currentTransactionStatus = useMemo(
    () =>
      activityDetail.type !== 'rewards'
        ? getCurrentTransactionStatus(walletActivities, activityDetail.activity.id) ?? activityInfo?.status
        : activityInfo?.status,
    [activityDetail.activity, activityDetail.type, activityInfo?.status, walletActivities]
  );

  const fetchActivityInfo = useCallback(async () => {
    const result = await getActivityDetail({ coinPrices: price, fiatCurrency });
    setActivityInfo(result);
  }, [getActivityDetail, setActivityInfo, price, fiatCurrency]);

  useEffect(() => {
    fetchActivityInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fetchingActivityInfo || !activityInfo) return <Skeleton data-testid="transaction-details-skeleton" />;

  const name =
    activityInfo.status === ActivityStatus.PENDING
      ? t('package.core.activityDetails.sending')
      : getTypeLabel(activityInfo.type, t);

  const amountTransformer = (ada: string) =>
    `${Wallet.util.convertAdaToFiat({ ada, fiat: price?.cardano?.price })} ${fiatCurrency?.code}`;

  return (
    <>
      {activityInfo.type === 'rewards' ? (
        <RewardsDetails
          name={name}
          status={activityInfo.status}
          includedDate={activityInfo.activity.includedUtcDate}
          amountTransformer={amountTransformer}
          coinSymbol={cardanoCoin.symbol}
          rewards={activityInfo.activity.rewards}
        />
      ) : (
        <TransactionDetailsProxy
          name={name}
          activityInfo={activityInfo}
          direction={activityDetail.direction}
          status={currentTransactionStatus}
          amountTransformer={amountTransformer}
        />
      )}
    </>
  );
};
