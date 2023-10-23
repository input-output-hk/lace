import { create } from 'zustand';

export enum StakingError {
  UTXO_FULLY_DEPLETED = 'UTXO_FULLY_DEPLETED',
  UTXO_BALANCE_INSUFFICIENT = 'UTXO_BALANCE_INSUFFICIENT',
}

export interface StakingStore {
  isStakeConfirmationVisible: boolean;
  setStakeConfirmationVisible: (visibility: boolean) => void;
  isExitStakingVisible: boolean;
  setExitStakingVisible: (visibility: boolean) => void;
  isNoFundsVisible: boolean;
  setNoFundsVisible: (visibility: boolean) => void;
  isBuildingTx: boolean;
  setIsBuildingTx: (visibility: boolean) => void;
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
}));
