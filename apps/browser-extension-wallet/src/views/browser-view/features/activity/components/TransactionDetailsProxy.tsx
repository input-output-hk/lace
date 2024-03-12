import React, { ReactElement, useMemo } from 'react';
import { ActivityStatus, DelegationActivityType, TransactionDetails } from '@lace/core';
import { AddressListType, getTransactionData } from './ActivityDetail';
import { useWalletStore } from '@src/stores';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import type { TransactionActivityDetail, TxDirection } from '@src/types';
import { TxDirections } from '@src/types';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { config } from '@src/config';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

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
      certificates
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

    const handleOpenExternalHashLink = () => {
      analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailTransactionHashClick);
      const externalLink = `${explorerBaseUrl}/${hash}`;
      externalLink && status === ActivityStatus.SUCCESS && openExternalLink(externalLink);
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
        sendAnalyticsInputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailInputsClick)}
        sendAnalyticsOutputs={() => analytics.sendEventToPostHog(PostHogAction.ActivityActivityDetailOutputsClick)}
        proposalProcedures={proposalProcedures}
        votingProcedures={votingProcedures}
        certificates={certificates}
        handleOpenExternalHashLink={handleOpenExternalHashLink}
        openExternalLink={openExternalLink}
      />
    );
  }
);
