import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import { Skeleton } from 'antd';
import { Wallet } from '@lace/cardano';
import {
  ActivityType,
  ConwayEraCertificatesTypes,
  ActivityStatus,
  AssetActivityListProps,
  DelegationActivityType,
  RewardsDetails,
  TransactionActivityType,
  TxOutputInput,
  TxSummary
} from '@lace/core';
import { PriceResult } from '@hooks';
import { useWalletStore } from '@stores';
import { ActivityDetail as ActivityDetailType } from '@src/types';
import { useCurrencyStore } from '@providers';
import { TransactionDetailsProxy } from './TransactionDetailsProxy';
import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@lace/translation';
import { SharedWalletTransactionDetailsWrapper } from './SharedWalletTransactionDetailsWrapper';

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
      addr: addrs.slice(0, MAX_SUMMARY_ADDRESSES),
      type: TransactionActivityType.incoming
    }));
  }

  // For outgoing/sent type of tx the receiver addresses will be all addresses available in activityInfo?.tx.addrOutputs list (except the current one)
  return addrOutputs
    .filter((output) => !walletAddresses.includes(output.addr))
    .map((output) => ({
      ...output,
      ...(!Array.isArray(output.addr) && { addr: [output.addr] }),
      type: TransactionActivityType.outgoing
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

const getTypeLabel = (type: ActivityType): TranslationKey => {
  if (type === DelegationActivityType.delegationRegistration || type === ConwayEraCertificatesTypes.Registration)
    return 'core.activityDetails.registration';
  if (type === DelegationActivityType.delegationDeregistration || type === ConwayEraCertificatesTypes.Unregistration)
    return 'core.activityDetails.deregistration';
  if (type === TransactionActivityType.incoming) return 'core.activityDetails.received';
  if (type === TransactionActivityType.outgoing) return 'core.activityDetails.sent';
  if (type === TransactionActivityType.awaitingCosignatures) return 'core.activityDetails.awaitingCosignatures';
  return `core.activityDetails.${type}`;
};

export const ActivityDetail = ({ price }: ActivityDetailProps): ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { t } = useTranslation();
  const { getActivityDetail, activityDetail, fetchingActivityInfo, walletActivities } = useWalletStore();
  const [activityInfo, setActivityInfo] = useState<ActivityDetailType>();
  const { fiatCurrency } = useCurrencyStore();

  const currentTransactionStatus = useMemo(
    () =>
      activityDetail.type !== TransactionActivityType.rewards
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
      ? t('core.activityDetails.sending')
      : t(getTypeLabel(activityInfo.type));

  const amountTransformer = (ada: string) =>
    `${Wallet.util.convertAdaToFiat({ ada, fiat: price?.cardano?.price })} ${fiatCurrency?.code}`;

  if (activityInfo.type === TransactionActivityType.rewards) {
    return (
      <RewardsDetails
        name={name}
        includedDate={activityInfo.activity.includedUtcDate}
        includedTime={activityInfo.activity.includedUtcTime}
        amountTransformer={amountTransformer}
        coinSymbol={cardanoCoin.symbol}
        rewards={activityInfo.activity.rewards}
      />
    );
  }

  if (activityInfo.type === TransactionActivityType.awaitingCosignatures) {
    return (
      <SharedWalletTransactionDetailsWrapper
        amountTransformer={amountTransformer}
        activityInfo={activityInfo}
        direction={activityDetail.direction}
      />
    );
  }

  return (
    <TransactionDetailsProxy
      name={name}
      activityInfo={activityInfo}
      direction={activityDetail.direction}
      status={currentTransactionStatus}
      amountTransformer={amountTransformer}
    />
  );
};
