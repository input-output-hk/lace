import { useEffect, useState } from 'react';
import { Cardano } from '@cardano-sdk/core';
import { useWalletStore } from '@stores';
import { useObservable } from '@lace/common';
import { COLLATERAL_AMOUNT_LOVELACES } from '@utils/constants';

export const useHasEnoughCollateral = (): boolean => {
  const [hasEnoughAda, setHasEnoughAda] = useState<boolean>(false);
  const { inMemoryWallet } = useWalletStore();
  const addresses = useObservable(inMemoryWallet?.addresses$);

  useEffect(() => {
    (async () => {
      const walletAddress = addresses?.[0]?.address;
      const output = {
        address: walletAddress && Cardano.PaymentAddress(walletAddress),
        value: {
          coins: COLLATERAL_AMOUNT_LOVELACES
        }
      };

      try {
        await inMemoryWallet.createTxBuilder().addOutput(output).build().inspect();
        setHasEnoughAda(true);
      } catch {
        setHasEnoughAda(false);
      }
    })();
  }, [addresses, inMemoryWallet]);

  return hasEnoughAda;
};
