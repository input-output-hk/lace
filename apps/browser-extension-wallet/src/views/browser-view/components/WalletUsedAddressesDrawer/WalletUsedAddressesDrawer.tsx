import { useObservable } from '@lace/common';
import React, { useMemo } from 'react';
import { map } from 'rxjs';
import { useWalletStore } from '../../../../stores';
import { useDrawer } from '../../stores';
import { UsedAddressesSchema, WalletUsedAddressesDrawer as Component } from './WalletUsedAddressesDrawer.component';
import { isScriptAddress } from '@cardano-sdk/wallet';

export const WalletUsedAddressesDrawer = (): React.ReactElement => {
  const { inMemoryWallet } = useWalletStore();
  const usedAddresses$ = useMemo(
    () =>
      inMemoryWallet?.addresses$.pipe(
        map((addresses) =>
          addresses
            // TODO: Filter used when multi address in supported
            // .filter((address) => address.isUsed)
            .map((address, addressNo) => ({
              address: address.address.toString(),
              // TODO: might be better to id script addresses by address LW-9574
              id: isScriptAddress(address) ? addressNo : address.index
            }))
        )
      ),
    [inMemoryWallet]
  );

  const usedAddresses: UsedAddressesSchema[] = useObservable(usedAddresses$);
  const [, closeDrawer] = useDrawer();

  return <Component onCloseClick={closeDrawer} usedAddresses={usedAddresses} />;
};
