import { useCurrencyStore } from '@providers';
import { useWalletStore } from '@src/stores';
import { useObservable } from './useObservable';
import { DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import { getTokenList } from '@src/utils/get-token-list';
import { useMemo } from 'react';
import { Wallet } from '@lace/cardano';

export const useFindNftByPolicyId = (policyId: Wallet.Cardano.PolicyId) => {
  const { inMemoryWallet, environmentName } = useWalletStore();
  const { fiatCurrency } = useCurrencyStore();
  const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);

  return useMemo(() => {
    const { nftList } = getTokenList({ assetsInfo, balance: assetsBalance?.assets, environmentName, fiatCurrency });
    return nftList.find((nft) => assetsInfo.get(nft.assetId).policyId === policyId);
  }, [assetsInfo, assetsBalance?.assets, fiatCurrency, environmentName, policyId]);
};
