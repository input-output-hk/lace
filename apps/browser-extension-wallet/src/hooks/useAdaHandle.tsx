/* eslint-disable consistent-return */
import { useEffect, useState } from 'react';
import { getTokenList, NFT } from '@utils/get-token-list';
import { useCurrencyStore } from '@providers';
import { useObservable } from '@hooks/useObservable';
import { DEFAULT_WALLET_BALANCE } from '@utils/constants';
import { useWalletStore } from '@stores';
import { Cardano } from '@cardano-sdk/core';
import { ADA_HANDLE_POLICY_ID } from '@src/features/ada-handle/config';
import { deleteFromLocalStorage, getValueFromLocalStorage, saveValueInLocalStorage } from '@utils/local-storage';

const getAdaHandle = (nfts: NFT[]): NFT => {
  if (nfts.length === 0) return;
  const adaHandles = nfts.filter((nft) => Cardano.AssetId.getPolicyId(nft.assetId) === ADA_HANDLE_POLICY_ID);
  if (adaHandles.length === 0) return;
  if (adaHandles.length === 1) return adaHandles[0];

  const [handle] = adaHandles.sort((a, b) => a.name.length - b.name.length);
  return handle;
};

export const useAdaHandle = (): NFT => {
  const { inMemoryWallet, environmentName } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const storedHandle = getValueFromLocalStorage('handle');

  const [handle, setHandle] = useState<NFT | undefined>();

  useEffect(() => {
    const fetchData = () => {
      const { nftList } = getTokenList({ assetsInfo, balance: assetsBalance?.assets, environmentName, fiatCurrency });
      const resolvedHandle = getAdaHandle(nftList);
      resolvedHandle && saveValueInLocalStorage({ key: 'handle', value: resolvedHandle });
      setHandle(resolvedHandle);
    };

    fetchData();
  }, [assetsBalance?.assets, assetsInfo, environmentName, fiatCurrency]);

  useEffect(() => {
    if (handle === undefined) {
      deleteFromLocalStorage('handle');
    }
  }, [handle]);

  return handle || storedHandle;
};
