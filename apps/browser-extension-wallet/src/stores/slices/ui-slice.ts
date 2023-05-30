import { Wallet } from '@lace/cardano';
import isNil from 'lodash/isNil';
import { NetworkConnectionStates, WalletUIProps } from '@src/types';
import { AppMode, cardanoCoin, CARDANO_COIN_SYMBOL } from '@src/utils/constants';
import { GetState, SetState } from 'zustand';
import { SliceCreator, UISlice } from '../types';

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

const getWalletUI = ({ currentNetwork, appMode }: { currentNetwork: Wallet.Cardano.NetworkId; appMode: AppMode }) => ({
  appMode,
  cardanoCoin: {
    ...cardanoCoin,
    symbol: CARDANO_COIN_SYMBOL[currentNetwork]
  },
  networkConnection: NetworkConnectionStates.CONNNECTED,
  areBalancesVisible: true,
  hiddenBalancesPlaceholder: '*',
  canManageBalancesVisibility: process.env.USE_HIDE_MY_BALANCE === 'true'
});

export const uiSlice: SliceCreator<UISlice, UISlice, WalletUIProps> = ({ get, set }, { currentChain, appMode }) => ({
  walletUI: getWalletUI({ currentNetwork: currentChain.networkId, appMode }),
  setCardanoCoin: (chain: Wallet.Cardano.ChainId) => setWalletUI({ network: chain.networkId }, { get, set }),
  setNetworkConnection: (networkConnection: NetworkConnectionStates) =>
    setWalletUI({ networkConnection }, { get, set }),
  setBalancesVisibility: (areBalancesVisible: boolean) => setWalletUI({ areBalancesVisible }, { get, set })
});
