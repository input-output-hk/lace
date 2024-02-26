import RefreshIcon from '@assets/icons/refresh.component.svg';
import WarningIcon from '@assets/icons/warning.component.svg';
import styles from '@components/MainLoader/MainLoader.module.scss';
import { Loader, toast } from '@lace/common';
import { AddressesDiscoveryStatus } from '@lib/communication/addresses-discoverer';
import { useWalletStore } from '@stores';
import { WarningModal } from '@views/browser/components';
import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const AddressesDiscoveryOverlay: FC = ({ children }) => {
  const { t } = useTranslation();
  const { hdDiscoveryStatus, initialHdDiscoveryCompleted } = useWalletStore();
  const [prevHdDiscoveryStatus, setPrevHdDiscoveryStatus] = useState<AddressesDiscoveryStatus | null>();

  useEffect(() => {
    const prevStatusWasInProgress = prevHdDiscoveryStatus === AddressesDiscoveryStatus.InProgress;
    setPrevHdDiscoveryStatus(hdDiscoveryStatus);

    if (
      !prevStatusWasInProgress ||
      ![AddressesDiscoveryStatus.Error, AddressesDiscoveryStatus.Idle].includes(hdDiscoveryStatus)
    ) {
      return;
    }

    toast.notify({
      icon: AddressesDiscoveryStatus.Error === hdDiscoveryStatus ? WarningIcon : RefreshIcon,
      text: t(
        AddressesDiscoveryStatus.Error === hdDiscoveryStatus
          ? 'addressesDiscovery.toast.errorText'
          : 'addressesDiscovery.toast.successText'
      ),
      withProgressBar: true
    });
  }, [hdDiscoveryStatus, prevHdDiscoveryStatus, t]);

  return (
    <>
      {children}
      {initialHdDiscoveryCompleted && hdDiscoveryStatus === AddressesDiscoveryStatus.InProgress && (
        <WarningModal
          visible
          header={t('addressesDiscovery.overlay.title')}
          content={<Loader className={styles.loader} data-testid="hd-discovery-loader" />}
          dataTestId="address-discovery-warning-modal"
        />
      )}
    </>
  );
};
