import React, { VFC, useMemo } from 'react';
import { useWalletStore } from '@stores';
import { map } from 'rxjs';
import { isScriptAddress } from '@cardano-sdk/wallet';
import { UsedAddressesSchema } from '@views/browser/components/WalletUsedAddressesDrawer/WalletUsedAddressesDrawer.component';
import { useObservable } from '@lace/common';
import { useDrawer } from '@views/browser/stores';
import { SignMessage } from '@lace/core';

export const SignMessageDrawer: VFC = () => {
  const { inMemoryWallet } = useWalletStore();
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
  // eslint-disable-next-line no-console
  return <SignMessage addresses={usedAddresses} onClose={closeDrawer} onSign={() => console.log('on sign')} />;
};
