/* eslint-disable sonarjs/cognitive-complexity */
import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';
import { GetState, SetState } from 'zustand';
import BigNumber from 'bignumber.js';
import groupBy from 'lodash/groupBy';
import flatten from 'lodash/flatten';
import memoize from 'lodash/memoize';
import { Wallet } from '@lace/cardano';
import { Reward, TxCBOR, epochSlotsCalc } from '@cardano-sdk/core';
import {
  filterOutputsByTxDirection,
  isTxWithAssets,
  TransformedActivity,
  TransformedTransactionActivity
} from '@src/views/browser-view/features/activity/helpers';
import {
  ActivityAssetProp,
  ActivityStatus,
  ActivityType,
  AssetActivityItemProps,
  AssetActivityListProps,
  DelegationActivityType,
  TransactionActivityType
} from '@lace/core';
import { CurrencyInfo, TxDirections } from '@src/types';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { assetTransformer } from '@src/utils/assets-transformers';
import {
  WalletActivitiesSlice,
  StateStatus,
  WalletInfoSlice,
  AssetDetailsSlice,
  ActivityDetailSlice,
  UISlice,
  BlockchainProviderSlice,
  SliceCreator
} from '../types';
import { getAssetsInformation } from '@src/utils/get-assets-information';
import { rewardHistoryTransformer } from '@src/views/browser-view/features/activity/helpers/reward-history-transformer';
import { createHistoricalOwnInputResolver } from '@src/utils/own-input-resolver';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { ObservableWalletState } from '@hooks/useWalletState';
import { IBlockchainProvider } from './blockchain-provider-slice';
import { txTransformer } from '@src/views/browser-view/features/activity/helpers/common-tx-transformer';

export interface FetchWalletActivitiesProps {
  fiatCurrency: CurrencyInfo;
  cardanoFiatPrice: number;
  assetId?: Wallet.Cardano.AssetId; // Allows to filter historicals tx by asset
  sendAnalytics?: () => void;
}

interface FetchWalletActivitiesPropsWithSetter extends FetchWalletActivitiesProps {
  get: GetState<
    WalletInfoSlice &
      WalletActivitiesSlice &
      ActivityDetailSlice &
      AssetDetailsSlice &
      UISlice &
      BlockchainProviderSlice
  >;
  set: SetState<WalletActivitiesSlice>;
}

type ExtendedActivityProps = TransformedActivity & AssetActivityItemProps;
type MappedActivityListProps = Omit<AssetActivityListProps, 'items'> & {
  items: ExtendedActivityProps[];
};
export type FetchWalletActivitiesReturn = MappedActivityListProps[];

type DelegationActivityItemProps = Omit<ExtendedActivityProps, 'type'> & {
  type: DelegationActivityType;
};

const isDelegationActivity = (activity: ExtendedActivityProps): activity is DelegationActivityItemProps =>
  activity.type in DelegationActivityType;

const getDelegationAmount = (activity: DelegationActivityItemProps) => {
  const fee = new BigNumber(Number.parseFloat(activity.fee));

  if (activity.type === DelegationActivityType.delegationRegistration) {
    return fee.plus(activity.deposit);
  }

  if (activity.type === DelegationActivityType.delegationDeregistration) {
    return new BigNumber(activity.depositReclaim).minus(fee);
  }

  return fee;
};

const FIAT_PRICE_DECIMAL_PLACES = 2;

const getFiatAmount = (amount: BigNumber, fiatPrice: number) =>
  fiatPrice ? amount.times(new BigNumber(fiatPrice)).toFormat(FIAT_PRICE_DECIMAL_PLACES) : '';

type TxWithTypeAndDirection = {
  tx: Wallet.Cardano.HydratedTx;
  type: Exclude<ActivityType, TransactionActivityType.rewards>;
  direction: TxDirections;
};

const extendTxWithTypeAndDirection = async ({
  tx,
  keyHashAddresses,
  inputResolver
}: {
  tx: Wallet.Cardano.HydratedTx;
  keyHashAddresses: Wallet.KeyManagement.GroupedAddress[];
  inputResolver: Wallet.Cardano.InputResolver;
}): Promise<TxWithTypeAndDirection> => {
  // Note that TxInFlight at type level does not expose its inputs with address,
  // which would prevent `inspectTxType` from determining whether tx is incoming or outgoing.
  // However at runtime, the "address" property is present (ATM) and the call below works.
  // SDK Ticket LW-8767 should fix the type of Input in TxInFlight to contain the address
  const [type] = await inspectTxType({ walletAddresses: keyHashAddresses, tx, inputResolver });
  const direction = getTxDirection({ type });
  return { tx, type, direction };
};

const initialState = {
  walletActivities: [] as AssetActivityListProps[],
  activitiesCount: 0,
  walletActivitiesStatus: StateStatus.IDLE
};

const mapWalletActivities = memoize(
  async (
    {
      addresses,
      transactions,
      eraSummaries,
      protocolParameters,
      assetInfo,
      delegation: { rewardsHistory }
    }: ObservableWalletState,
    { fiatCurrency, cardanoFiatPrice, sendAnalytics }: FetchWalletActivitiesProps,
    {
      assetDetails,
      assetProvider,
      cardanoCoin,
      setRewardsActivityDetail,
      setTransactionActivityDetail
    }: Pick<UISlice['walletUI'], 'cardanoCoin'> &
      Pick<ActivityDetailSlice, 'setRewardsActivityDetail' | 'setTransactionActivityDetail'> &
      Pick<AssetDetailsSlice, 'assetDetails'> &
      Pick<IBlockchainProvider, 'assetProvider'>
  ) => {
    const epochRewardsMapper = (earnedEpoch: Wallet.Cardano.EpochNo, rewards: Reward[]): ExtendedActivityProps => {
      const REWARD_SPENDABLE_DELAY_EPOCHS = 2;
      const spendableEpoch = (earnedEpoch + REWARD_SPENDABLE_DELAY_EPOCHS) as Wallet.Cardano.EpochNo;
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      const rewardSpendableDate = slotTimeCalc(epochSlotsCalc(spendableEpoch, eraSummaries).firstSlot);

      const transformedEpochRewards = rewardHistoryTransformer({
        rewards,
        fiatCurrency,
        fiatPrice: cardanoFiatPrice,
        cardanoCoin,
        date: rewardSpendableDate
      });

      return {
        ...transformedEpochRewards,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          setRewardsActivityDetail({
            activity: {
              rewards,
              spendableEpoch,
              spendableDate: rewardSpendableDate
            }
          });
        }
      };
    };

    const inputResolver = createHistoricalOwnInputResolver({ addresses, transactions });
    const resolveInput = inputResolver.resolveInput;

    // eslint-disable-next-line unicorn/no-array-callback-reference
    const keyHashAddresses = addresses.filter(isKeyHashAddress);
    if (keyHashAddresses.length !== addresses.length) {
      throw new Error('TODO: implement script address support');
    }
    const historicTransactionMapper = async ({
      tx,
      type,
      direction
    }: TxWithTypeAndDirection): Promise<ExtendedActivityProps[]> => {
      const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
      const date = slotTimeCalc(tx.blockHeader.slot);

      const transformedTransaction = await txTransformer({
        tx,
        walletAddresses: keyHashAddresses,
        fiatCurrency,
        fiatPrice: cardanoFiatPrice,
        date,
        protocolParameters,
        cardanoCoin,
        status: Wallet.TransactionStatus.SUCCESS,
        direction,
        type,
        resolveInput
      });

      const extendWithClickHandler = (transformedTx: TransformedTransactionActivity) => ({
        ...transformedTx,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          setTransactionActivityDetail({
            activity: tx,
            direction: transformedTx.direction,
            status: transformedTx.status,
            type: transformedTx.type
          });
        }
      });

      return transformedTransaction.map((tt) => extendWithClickHandler(tt));
    };

    const pendingTransactionMapper = async (tx: Wallet.TxInFlight): Promise<ExtendedActivityProps[]> => {
      const { type } = await extendTxWithTypeAndDirection({
        tx: tx as unknown as Wallet.Cardano.HydratedTx,
        keyHashAddresses,
        inputResolver
      });

      let date;
      try {
        const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
        date = slotTimeCalc(tx.submittedAt);
      } catch {
        date = new Date();
      }

      const transformedTransaction = await txTransformer({
        tx,
        walletAddresses: keyHashAddresses,
        fiatCurrency,
        fiatPrice: cardanoFiatPrice,
        protocolParameters,
        cardanoCoin,
        date,
        status: Wallet.TransactionStatus.PENDING,
        direction: TxDirections.Outgoing,
        type,
        resolveInput
      });

      const extendWithClickHandler = (transformedTx: TransformedTransactionActivity) => ({
        ...transformedTx,
        onClick: () => {
          if (sendAnalytics) sendAnalytics();
          const deserializedTx: Wallet.Cardano.Tx = TxCBOR.deserialize(tx.cbor);
          setTransactionActivityDetail({
            activity: deserializedTx,
            direction: TxDirections.Outgoing,
            status: ActivityStatus.PENDING,
            type: transformedTx.type
          });
        }
      });

      return transformedTransaction.map((tt) => extendWithClickHandler(tt));
    };

    const filterTransactionByAssetId = (txs: TxWithTypeAndDirection[]) =>
      txs.filter(({ tx, type }) => {
        const direction = getTxDirection({ type });
        const paymentAddresses: Wallet.Cardano.PaymentAddress[] = addresses.map((addr) => addr.address);
        return filterOutputsByTxDirection(tx.body.outputs, direction, paymentAddresses).some((output) =>
          isTxWithAssets(Wallet.Cardano.AssetId(assetDetails.id), output?.value?.assets)
        );
      });

    /**
     * Sanitizes historical transactions data
     */
    const getHistoricalTransactions = async () => {
      const extended = await Promise.all(
        transactions.history.map((tx) => extendTxWithTypeAndDirection({ tx, keyHashAddresses, inputResolver }))
      );
      const filtered = assetDetails?.id === cardanoCoin.id ? extended : filterTransactionByAssetId(extended);
      return flatten(await Promise.all(filtered.map((tx) => historicTransactionMapper(tx))));
    };

    /**
     * Sanitizes pending transactions data
     */
    const getPendingTransactions = async (): Promise<ExtendedActivityProps[]> =>
      flatten(await Promise.all(transactions.outgoing.inFlight.map((tx) => pendingTransactionMapper(tx))));

    /**
     * Sanitizes historical rewards data
     */
    const getRewardsHistory = () =>
      Object.entries(groupBy(rewardsHistory.all, ({ epoch }) => epoch.toString()))
        .map(([epoch, rewards]) => epochRewardsMapper(Number(epoch) as Wallet.Cardano.EpochNo, rewards))
        .filter((reward) => reward.date.getTime() < Date.now());

    /**
     * Emits the lists combined and sets current state for Zustand
     */
    const [historicalTransactions, pendingTransactions, rewards] = await Promise.all([
      getHistoricalTransactions(),
      getPendingTransactions(),
      assetDetails ? [] : getRewardsHistory()
    ]);

    const confirmedTxs = historicalTransactions;
    const pendingTxs = pendingTransactions;
    /* After the transaction is confirmed is not being removed from pendingTransactions$, so we have to remove it manually from pending list
      this is a workaround, as it seems to be an issue on the sdk side
      */
    const filteredPendingTxs = pendingTxs.filter((pending) =>
      confirmedTxs.some((confirmed) => confirmed?.id !== pending?.id)
    );
    const allTransactions = groupBy(
      [...filteredPendingTxs, ...confirmedTxs, ...rewards].sort((firstTx, secondTx) => {
        // ensure pending txs are always first
        if (firstTx.status === ActivityStatus.PENDING && secondTx.status !== ActivityStatus.PENDING) return -1;
        if (secondTx.status === ActivityStatus.PENDING && firstTx.status !== ActivityStatus.PENDING) return 1;
        // otherwise sort by date
        return secondTx.date.getTime() - firstTx.date.getTime();
      }),
      'formattedDate'
    );
    const allActivities = Object.entries(allTransactions).map(([listName, transactionsList]) => ({
      title: listName,
      items: transactionsList
    }));
    const flattenedActivities = flattenDeep(allActivities.map(({ items }: AssetActivityListProps) => items));
    const allAssetsIds = uniq(
      flattenDeep(
        flattenedActivities.map(({ assets }: AssetActivityItemProps) =>
          assets.map(({ id }: ActivityAssetProp) => Wallet.Cardano.AssetId(id))
        )
      )
    );
    const assetsInfo = await getAssetsInformation(allAssetsIds, assetInfo, {
      assetProvider,
      extraData: {
        nftMetadata: true,
        tokenMetadata: true
      }
    });
    const walletActivities = allActivities.map((activityList) => ({
      ...activityList,
      items: activityList.items.map((activity) => ({
        ...activity,
        ...(isDelegationActivity(activity) && {
          amount: `${getDelegationAmount(activity)} ${cardanoCoin.symbol}`,
          fiatAmount: `${getFiatAmount(getDelegationAmount(activity), cardanoFiatPrice)} ${fiatCurrency.code}`
        }),
        ...(activity.type === TransactionActivityType.self && {
          amount: `${activity.fee} ${cardanoCoin.symbol}`,
          fiatAmount: cardanoFiatPrice
            ? `${getFiatAmount(new BigNumber(activity.fee), cardanoFiatPrice)} ${fiatCurrency.code}`
            : '-'
        }),
        assets: activity.assets.map((asset: ActivityAssetProp) => {
          const assetId = Wallet.Cardano.AssetId(asset.id);
          const token = assetsInfo.get(assetId);
          const assetData = !token
            ? undefined
            : assetTransformer({
                token,
                key: assetId,
                total: { coins: BigInt(0), assets: new Map([[assetId, BigInt(asset.val)]]) },
                fiatCurrency
              });
          return {
            id: asset.id,
            val: Wallet.util.calculateAssetBalance(asset.val, token),
            info: {
              ticker: (assetData?.name !== '-' && assetData?.name) || assetData?.ticker
            }
          };
        })
      }))
    }));
    return {
      allActivities,
      walletActivities,
      activitiesCount: allActivities.reduce((accumulator, currentList) => accumulator + currentList.items.length, 0)
    };
  },
  (
    { addresses, transactions, assetInfo, delegation: { rewardsHistory } },
    { cardanoFiatPrice, fiatCurrency, assetId },
    { cardanoCoin, assetDetails }
  ) =>
    `${transactions.history.length}_${transactions.outgoing.inFlight.length}_${assetInfo.size}_${
      rewardsHistory.all.length
    }_${cardanoFiatPrice}_${fiatCurrency.code}_${assetId || ''}_${cardanoCoin?.id}_${assetDetails?.id}_${
      addresses[0]?.address
    }`
);

const getWalletActivities = async ({
  set,
  get,
  ...fetchActivitiesProps
}: FetchWalletActivitiesPropsWithSetter): Promise<MappedActivityListProps[] | undefined> => {
  set({ walletActivitiesStatus: StateStatus.LOADING });
  const {
    walletUI: { cardanoCoin },
    walletState,
    setTransactionActivityDetail,
    setRewardsActivityDetail,
    assetDetails,
    blockchainProvider: { assetProvider }
  } = get();
  if (!walletState) {
    set(initialState);
    return;
  }

  const { allActivities, walletActivities, activitiesCount } = await mapWalletActivities(
    walletState,
    fetchActivitiesProps,
    {
      assetProvider,
      cardanoCoin,
      setRewardsActivityDetail,
      setTransactionActivityDetail,
      assetDetails
    }
  );

  set({
    walletActivities,
    activitiesCount,
    walletActivitiesStatus: StateStatus.LOADED
  });

  // eslint-disable-next-line consistent-return
  return allActivities;
};

/**
 * has all wallet activities related actions and states
 */
export const walletActivitiesSlice: SliceCreator<
  WalletInfoSlice & WalletActivitiesSlice & ActivityDetailSlice & AssetDetailsSlice & UISlice & BlockchainProviderSlice,
  WalletActivitiesSlice
> = ({ set, get }) => ({
  getWalletActivities: ({ fiatCurrency, cardanoFiatPrice, assetId, sendAnalytics }: FetchWalletActivitiesProps) =>
    getWalletActivities({ fiatCurrency, cardanoFiatPrice, assetId, sendAnalytics, set, get }),
  ...initialState
});
