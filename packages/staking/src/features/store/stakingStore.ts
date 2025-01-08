import { DataOfKeyWithLockedRewards } from '@cardano-sdk/tx-construction';
import { create } from 'zustand';

export enum StakingErrorType {
  UTXO_FULLY_DEPLETED = 'UTXO_FULLY_DEPLETED',
  UTXO_BALANCE_INSUFFICIENT = 'UTXO_BALANCE_INSUFFICIENT',
  REWARDS_LOCKED = 'REWARDS_LOCKED',
}

export type StakingError =
  | { type: StakingErrorType.UTXO_BALANCE_INSUFFICIENT }
  | { type: StakingErrorType.UTXO_FULLY_DEPLETED }
  | {
      data: DataOfKeyWithLockedRewards[];
      type: StakingErrorType.REWARDS_LOCKED;
    };

export interface StakingStore {
  isStakeConfirmationVisible: boolean;
  setStakeConfirmationVisible: (visibility: boolean) => void;
  isExitStakingVisible: boolean;
  setExitStakingVisible: (visibility: boolean) => void;
  isNoFundsVisible: boolean;
  setNoFundsVisible: (visibility: boolean) => void;
  isBuildingTx: boolean;
  setIsBuildingTx: (visibility: boolean) => void;
  stakingError?: StakingError;
  setStakingError: (error?: StakingError) => void;
}

export const useStakingStore = create<StakingStore>((set) => ({
  isBuildingTx: false,
  isExitStakingVisible: false,
  isNoFundsVisible: false,
  isStakeConfirmationVisible: false,
  setExitStakingVisible: (visibility: boolean) => set({ isExitStakingVisible: visibility }),
  setIsBuildingTx: (visibility: boolean) => set({ isBuildingTx: visibility }),
  setNoFundsVisible: (visibility: boolean) => set({ isNoFundsVisible: visibility }),
  setStakeConfirmationVisible: (visibility: boolean) => set({ isStakeConfirmationVisible: visibility }),
  setStakingError: (error: StakingError | undefined) => set({ stakingError: error }),
  stakingError: undefined,
}));
