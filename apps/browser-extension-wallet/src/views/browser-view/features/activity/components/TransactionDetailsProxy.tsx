import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityStatus,
  CoSignersListItem,
  hasSigned,
  DelegationActivityType,
  SignPolicy,
  TransactionDetails
} from '@lace/core';
import { AddressListType, getTransactionData } from './ActivityDetail';
import { useWalletStore } from '@src/stores';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import type { TransactionActivityDetail, TxDirection } from '@src/types';
import { TxDirections } from '@src/types';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useCexplorerBaseUrl } from '@src/features/dapp/components/confirm-transaction/hooks';
import { useObservable } from '@lace/common';
import { getAllWalletsAddresses } from '@src/utils/get-all-wallets-addresses';
import { walletRepository } from '@lib/wallet-api-ui';
import { useSharedWalletData } from '@hooks';
import { eraSlotDateTime } from '@src/utils/era-slot-datetime';

type TransactionDetailsProxyProps = {
  name: string;
  activityInfo: TransactionActivityDetail;
  direction: TxDirection;
  status: ActivityStatus;
  amountTransformer: (amount: string) => string;
};
export const TransactionDetailsProxy = withAddressBookContext(
  ({ name, activityInfo, direction, status, amountTransformer }: TransactionDetailsProxyProps): ReactElement => {
    const analytics = useAnalyticsContext();
    const {
      inMemoryWallet,
      walletInfo,
      walletUI: { cardanoCoin, appMode },
      currentChain,
      activityDetail
    } = useWalletStore();
    const isPopupView = appMode === APP_MODE_POPUP;
    const openExternalLink = useExternalLinkOpener();

    const { sharedWalletKey, getSignPolicy, coSigners } = useSharedWalletData();
    const [signPolicy, setSignPolicy] = useState<SignPolicy>();
    const [transactionCosigners, setTransactionCosigners] = useState<CoSignersListItem[]>([]);

    useEffect(() => {
      if (activityDetail.status !== ActivityStatus.AWAITING_COSIGNATURES) return;
      (async () => {
        const policy = await getSignPolicy('payment');
        setSignPolicy(policy);

        const signatures = activityDetail.activity.witness.signatures;
        const cosignersWithSignStatus = await Promise.all(
          coSigners.map(async (signer) => ({
            ...signer,
            signed: await hasSigned(signer.sharedWalletKey, 'payment', signatures)
          }))
        );
        setTransactionCosigners(cosignersWithSignStatus);
      })();
    }, [activityDetail.activity, activityDetail.status, coSigners, getSignPolicy, sharedWalletKey]);

    // Prepare own addresses of active account
    const allWalletsAddresses = getAllWalletsAddresses(useObservable(walletRepository.wallets$));
    const walletAddresses = useObservable(inMemoryWallet.addresses$)?.map((a) => a.address);
    const eraSummaries = useObservable(inMemoryWallet.eraSummaries$);

    // Prepare address book data as Map<address, name>
    const { list: addressList } = useAddressBookContext();
    const explorerBaseUrl = useCexplorerBaseUrl();
    const addressToNameMap = useMemo(
      () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
      [addressList]
    );

    const getHeaderDescription = () => {
      if (activityInfo.type === DelegationActivityType.delegation) return '1 token';
      return ` (${activityInfo?.assetAmount})`;
    };
    const isIncomingTransaction = direction === TxDirections.Incoming;
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
      metadata,
      proposalProcedures,
      votingProcedures,
      certificates,
      collateral,
      validityInterval
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

    const expiresBy = useMemo(
      () => eraSummaries && validityInterval && eraSlotDateTime(eraSummaries, validityInterval.invalidHereafter),
      [eraSummaries, validityInterval]
    );

    const handleOpenExternalHashLink = () => {
      analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailTransactionHashClick);
      const externalLink = `${explorerBaseUrl}/${hash}`;
      externalLink && status === ActivityStatus.SUCCESS && openExternalLink(externalLink);
    };

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
        ownAddresses={allWalletsAddresses.length > 0 ? allWalletsAddresses : walletAddresses}
        addressToNameMap={addressToNameMap}
        coinSymbol={cardanoCoin.symbol}
        isPopupView={isPopupView}
        sendAnalyticsInputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailInputsClick)}
        sendAnalyticsOutputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailOutputsClick)}
        proposalProcedures={proposalProcedures}
        votingProcedures={votingProcedures}
        certificates={certificates}
        handleOpenExternalHashLink={handleOpenExternalHashLink}
        collateral={collateral}
        chainNetworkId={currentChain.networkId}
        cardanoCoin={cardanoCoin}
        explorerBaseUrl={explorerBaseUrl}
        ownSharedKey={sharedWalletKey}
        signPolicy={signPolicy}
        cosigners={transactionCosigners}
        expiresBy={expiresBy}
      />
    );
  }
);
