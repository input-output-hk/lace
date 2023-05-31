import { SetState, GetState } from 'zustand';
import { StateStatus, NetworkSlice, WalletInfoSlice, BlockchainProviderSlice, SliceCreator } from '../types';
import { networkInfoTransformer } from '../../api/transformers';
import { firstValueFrom } from 'rxjs';

const fetchNetworkInfo =
  ({
    set,
    get
  }: {
    set: SetState<NetworkSlice>;
    // WalletInfoSlice is required so we could select inMemoryWallet obj
    get: GetState<WalletInfoSlice & NetworkSlice & BlockchainProviderSlice>;
  }) =>
  async () => {
    const {
      inMemoryWallet,
      blockchainProvider: { networkInfoProvider, stakePoolProvider }
    } = get();
    set({ networkStateStatus: StateStatus.LOADING });
    const lovelaceSupply = await networkInfoProvider.lovelaceSupply();
    const stake = await networkInfoProvider.stake();
    // This one takes too long
    const poolStats = await stakePoolProvider.stakePoolStats();
    const currentEpoch = await firstValueFrom(inMemoryWallet.currentEpoch$);
    const network = networkInfoTransformer({ lovelaceSupply, stake, currentEpoch }, poolStats);

    set({ networkInfo: network, networkStateStatus: StateStatus.LOADED });
  };

/**
 * has all network related actions and states
 */
export const networkSlice: SliceCreator<
  WalletInfoSlice & NetworkSlice & BlockchainProviderSlice,
  NetworkSlice,
  void,
  NetworkSlice
> = ({ set, get }) => ({
  networkStateStatus: StateStatus.IDLE,
  fetchNetworkInfo: fetchNetworkInfo({ set, get })
});
