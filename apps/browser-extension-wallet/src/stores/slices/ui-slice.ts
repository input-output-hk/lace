import { Wallet } from '@lace/cardano';
import isNil from 'lodash/isNil';
import { ILocalStorage, NetworkConnectionStates, WalletUIProps } from '@src/types';
import { AppMode, cardanoCoin, CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { GetState, SetState } from 'zustand';
import { SliceCreator, UISlice } from '../types';
import { getValueFromLocalStorage, onStorageChangeEvent, saveValueInLocalStorage } from '@src/utils/local-storage';

const HIDE_BALANCE_FEATURE_ENABLED = process.env.USE_HIDE_MY_BALANCE === 'true';

const setWalletUI = (
  {
    network,
    networkConnection,
    areBalancesVisible
  }: { network?: Wallet.Cardano.NetworkId; networkConnection?: NetworkConnectionStates; areBalancesVisible?: boolean },
  { get, set }: { get: GetState<UISlice>; set: SetState<UISlice> }
): void => {
  const { walletUI } = get();
  set({
    walletUI: {
      ...walletUI,
      // Wallet.Cardano.NetworkId.Testnet === 0, so we need to check for real nullish values (eg: null, undefined)
      ...(!isNil(network) && {
        cardanoCoin: {
          ...cardanoCoin,
          symbol: CARDANO_COIN_SYMBOL[network]
        }
      }),
      ...(networkConnection && { networkConnection }),
      ...(!isNil(areBalancesVisible) && { areBalancesVisible })
    }
  });
};

const getWalletUI = ({ currentNetwork, appMode }: { currentNetwork: Wallet.Cardano.NetworkId; appMode: AppMode }) => {
  const shouldHideBalance = HIDE_BALANCE_FEATURE_ENABLED
    ? getValueFromLocalStorage<ILocalStorage, 'hideBalance'>('hideBalance')
    : false;

  return {
    appMode,
    cardanoCoin: {
      ...cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[currentNetwork]
    },
    networkConnection: NetworkConnectionStates.CONNNECTED,
    areBalancesVisible: !shouldHideBalance,
    hiddenBalancesPlaceholder: '*',
    canManageBalancesVisibility: HIDE_BALANCE_FEATURE_ENABLED
  };
};

export const uiSlice: SliceCreator<UISlice, UISlice, WalletUIProps> = ({ get, set }, { currentChain, appMode }) => {
  onStorageChangeEvent(['hideBalance'], (ev: StorageEvent) => {
    const hideBalance = JSON.parse(ev.newValue);
    setWalletUI({ areBalancesVisible: !hideBalance }, { get, set });
  });

  return {
    walletUI: getWalletUI({ currentNetwork: currentChain.networkId, appMode }),
    setCardanoCoin: (chain: Wallet.Cardano.ChainId) => setWalletUI({ network: chain.networkId }, { get, set }),
    setNetworkConnection: (networkConnection: NetworkConnectionStates) =>
      setWalletUI({ networkConnection }, { get, set }),
    setBalancesVisibility: (areBalancesVisible: boolean) => {
      if (!HIDE_BALANCE_FEATURE_ENABLED) return;
      saveValueInLocalStorage({ key: 'hideBalance', value: !areBalancesVisible });
      setWalletUI({ areBalancesVisible }, { get, set });
    }
  };
};
