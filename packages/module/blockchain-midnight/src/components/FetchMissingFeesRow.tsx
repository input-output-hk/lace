import { useTranslation } from '@lace-contract/i18n';
import { Modal, SettingsCard } from '@lace-lib/ui-toolkit';
import { nanoid } from '@reduxjs/toolkit';
import React, { useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../hooks/lace-context';

import type { MidnightNetwork } from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';

export const FetchMissingFeesRow = ({
  accountId,
}: {
  accountId: AccountId;
}) => {
  const { t } = useTranslation();
  const isSupported = useLaceSelector(
    'midnightContext.selectSupportsFeeRecovery',
  );
  const network = useLaceSelector('midnightContext.selectCurrentNetwork');
  const jobs = useLaceSelector('midnightContext.selectFeeRecoveryJobs');
  const request = useDispatchLaceAction('midnightContext.requestMissingFees');
  const cancel = useDispatchLaceAction('midnightContext.cancelFeeRecovery');
  const [consent, setConsent] = useState<MidnightNetwork>();
  const [requestId, setRequestId] = useState<string>();
  const job = jobs[accountId];
  const shownJob = job?.requestId === requestId ? job : undefined;
  const isRunning = shownJob?.status === 'running';
  const quickActions = useMemo(
    () => ({
      onCardPress: () => {
        setConsent(network);
      },
    }),
    [network],
  );

  useEffect(() => {
    if (
      consent &&
      (!isSupported ||
        consent.networkId !== network.networkId ||
        consent.config.indexerAddress !== network.config.indexerAddress)
    )
      setConsent(undefined);
  }, [consent, network, isSupported]);
  useEffect(
    () => () => {
      if (requestId) cancel({ accountId, requestId });
    },
    [accountId, requestId, cancel],
  );

  if (!isSupported) return null;
  const close = () => {
    setConsent(undefined);
    if (requestId) cancel({ accountId, requestId });
    setRequestId(undefined);
  };
  return (
    <>
      <SettingsCard
        iconName="Reload"
        testID="account-settings-fetch-missing-fees"
        title={t('midnight.fee-recovery.title')}
        description={t('midnight.fee-recovery.description')}
        quickActions={quickActions}
      />
      <Modal
        visible={!!consent}
        icon="AlertSquare"
        heading={t('midnight.fee-recovery.title')}
        description={t('midnight.fee-recovery.disclosure')}
        confirmText={t('midnight.fee-recovery.confirm')}
        onConfirm={() => {
          if (!consent) return;
          const id = nanoid();
          setRequestId(id);
          request({
            accountId,
            requestId: id,
            networkId: consent.networkId,
            indexerAddress: consent.config.indexerAddress,
          });
          setConsent(undefined);
        }}
        onCancel={close}
        onClose={close}
        testIdPrefix="fee-recovery-consent"
      />
      <Modal
        visible={!!shownJob}
        heading={t('midnight.fee-recovery.title')}
        description={
          shownJob
            ? t(`midnight.fee-recovery.${shownJob.status}`, {
                checked: shownJob.checked,
                recovered: shownJob.recovered,
              })
            : ''
        }
        confirmText={isRunning ? t('app.cancel') : undefined}
        onConfirm={close}
        onClose={close}
        testIdPrefix="fee-recovery-result"
      />
    </>
  );
};
