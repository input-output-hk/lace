/* eslint-disable react/jsx-handler-names */
import { useSharedWalletData, PriceResult } from '@hooks';
import { Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { ActivityStatus, exportMultisigTransaction, TransactionActivityType } from '@lace/core';
import { useCurrencyStore } from '@providers';
import { useWalletStore } from '@src/stores';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTransactionStatus } from './ActivityDetail';
import { ActivityDetail as ActivityDetailType } from '@src/types';
import { filter, firstValueFrom, map, timeout } from 'rxjs';
import { Wallet } from '@lace/cardano';

type ActionButtonSpec = { callback: () => void; dataTestId: string; label: string };
type ButtonNames = 'downloadJSON' | 'close';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const tmpNoop = () => {};
const getSpecOverride = (specOrBool: Partial<ActionButtonSpec> | boolean) =>
  typeof specOrBool === 'boolean' ? {} : specOrBool;

const makeActionButtons = (
  t: TFunction,
  { downloadJSON, close }: Record<ButtonNames, boolean | Partial<ActionButtonSpec>>
): ActionButtonSpec[] =>
  (
    [
      downloadJSON && {
        callback: tmpNoop,
        dataTestId: 'activity-details-download-json-btn',
        label: t('sharedWallets.transaction.actions.downloadJSON'),
        ...getSpecOverride(downloadJSON)
      },
      close && {
        callback: tmpNoop,
        dataTestId: 'activity-details-sign-tx-btn',
        label: t('sharedWallets.transaction.actions.close'),
        ...getSpecOverride(close)
      }
    ] as (ActionButtonSpec | false)[]
  ).filter(Boolean) as ActionButtonSpec[];

interface ActivityDetailFooterProps {
  price: PriceResult;
}

export const ActivityDetailFooter = ({ price }: ActivityDetailFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  const { currentChain, cardanoWallet, resetActivityState } = useWalletStore();
  const { getActivityDetail, activityDetail, walletActivities } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const { sharedWalletKey } = useSharedWalletData();
  const [signedTx, setSignedTx] = useState<Wallet.KeyManagement.WitnessedTx>();
  const [activityInfo, setActivityInfo] = useState<ActivityDetailType>();

  const currentTransactionStatus = useMemo(
    () =>
      activityDetail.type !== TransactionActivityType.rewards
        ? getCurrentTransactionStatus(walletActivities, activityDetail.activity.id) ?? activityInfo?.status
        : activityInfo?.status,
    [activityDetail.activity, activityDetail.type, activityInfo?.status, walletActivities]
  );

  const isAwaitingCosignatures = currentTransactionStatus === ActivityStatus.AWAITING_COSIGNATURES;

  const fetchActivityInfo = useCallback(async () => {
    const result = await getActivityDetail({ coinPrices: price, fiatCurrency });
    setActivityInfo(result);
  }, [getActivityDetail, price, fiatCurrency]);

  useEffect(() => {
    fetchActivityInfo();
  }, [fetchActivityInfo]);

  useEffect(() => {
    if (!activityInfo || !isAwaitingCosignatures) return;
    const awaitingCosignaturesActivityHash = 'hash' in activityInfo.activity && activityInfo.activity.hash;
    if (!awaitingCosignaturesActivityHash) return;
    (async () => {
      const tx = await firstValueFrom(
        cardanoWallet.wallet.transactions.outgoing.signed$.pipe(
          map((witnessedArray) =>
            witnessedArray.find((witnessed) => witnessed.tx.id === awaitingCosignaturesActivityHash)
          ),
          filter((witnessed) => witnessed !== undefined),
          // eslint-disable-next-line no-magic-numbers
          timeout(5000)
        )
      );

      if (tx) {
        setSignedTx(tx);
      }
    })();
  }, [
    activityInfo,
    activityInfo?.activity,
    cardanoWallet.wallet.transactions.outgoing.signed$,
    isAwaitingCosignatures
  ]);

  const onDownloadJSON = useCallback(() => {
    exportMultisigTransaction(signedTx.cbor, sharedWalletKey, currentChain);
  }, [currentChain, sharedWalletKey, signedTx?.cbor]);

  const onClose = useCallback(() => {
    resetActivityState();
  }, [resetActivityState]);

  const actionButtons = useMemo(
    () =>
      makeActionButtons(t, {
        downloadJSON: isAwaitingCosignatures && { callback: onDownloadJSON },
        close: isAwaitingCosignatures && signedTx && { callback: onClose }
      }),
    [isAwaitingCosignatures, onClose, onDownloadJSON, signedTx, t]
  );

  if (actionButtons.length === 0) return <></>;

  const [callToActionButton, ...secondaryButtons] = actionButtons;

  return (
    <>
      <Flex flexDirection="column" alignItems="stretch" gap="$16">
        {callToActionButton && (
          <Button.CallToAction
            label={callToActionButton.label}
            data-testid={callToActionButton.dataTestId}
            onClick={callToActionButton.callback}
            w="$fill"
          />
        )}
        <Text.Body.Small color="secondary">{t('sharedWallets.transaction.notification.downloadJSON')}</Text.Body.Small>
        {secondaryButtons.map(({ callback, dataTestId, label }) => (
          <Button.Secondary key={dataTestId} onClick={callback} data-testid={dataTestId} label={label} w="$fill" />
        ))}
      </Flex>
    </>
  );
};
