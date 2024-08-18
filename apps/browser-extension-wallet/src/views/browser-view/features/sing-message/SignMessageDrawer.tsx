import React, { VFC, useMemo } from 'react';
import { useWalletStore } from '@stores';
import { map } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { UsedAddressesSchema } from '@views/browser/components/WalletUsedAddressesDrawer/WalletUsedAddressesDrawer.component';
import { Drawer, DrawerNavigation, useObservable } from '@lace/common';
import { WalletUsedAddressList } from '@lace/core';
import { useDrawer } from '@views/browser/stores';
import { useTranslation } from 'react-i18next';
import styles from './SignMessageDrawer.module.scss';

// eslint-disable-next-line @typescript-eslint/ban-types
type SignMessageToolProps = {};

export const SignMessageDrawer: VFC<SignMessageToolProps> = () => {
  const { inMemoryWallet } = useWalletStore();
  const { t } = useTranslation();

  const [, closeDrawer] = useDrawer();
  const usedAddresses$ = useMemo(
    () =>
      inMemoryWallet?.addresses$.pipe(
        map((addresses) =>
          addresses
            // .filter((address) => address.isUsed)
            .map((address, addressNo) => ({
              address: address.address.toString(),
              id: isScriptAddress(address) ? addressNo : address.index
            }))
        )
      ),
    [inMemoryWallet]
  );

  const usedAddresses: UsedAddressesSchema[] = useObservable(usedAddresses$);
  const customHeaderTitle = (
    <div className={styles.draweHeaderTitle}>
      <h1 className={styles.title}>{t('browserView.signMessage.title')}</h1>
      <h4 className={styles.subtitle}>{t('browserView.signMessage.subtitle')}</h4>
    </div>
  );

  return (
    <Drawer
      visible
      onClose={() => closeDrawer()}
      title={customHeaderTitle}
      navigation={
        <DrawerNavigation
          title={t('browserView.signMessage.heading')}
          onCloseIconClick={closeDrawer}
          onArrowIconClick={closeDrawer}
        />
      }
    >
      <div className={styles.infoContainer}>
        <WalletUsedAddressList
          translations={{
            copy: t('core.receive.usedAddresses.copy'),
            addressCopied: t('core.receive.usedAddresses.addressCopied')
          }}
          items={usedAddresses}
        />
      </div>
    </Drawer>
  );
};
