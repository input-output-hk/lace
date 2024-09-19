import { useCallback } from 'react';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { StakingError } from '@src/views/browser-view/features/staking/types';
import { useWalletStore } from '../stores';
import { useDelegationStore } from '../features/delegation/stores';
import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { Wallet } from '@lace/cardano';

const ERROR_MESSAGES: { [key: string]: StakingError } = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingError.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingError.UTXO_BALANCE_INSUFFICIENT
};

export const useBuildDelegation = (): { buildDelegation: () => Promise<void> } => {
  const { inMemoryWallet } = useWalletStore();
  const { selectedStakePool, setDelegationTxBuilder, setDelegationTxFee } = useDelegationStore();
  const { setIsBuildingTx, setStakingError } = useStakePoolDetails();

  const buildDelegation = useCallback(
    async (hexId?: Wallet.Cardano.PoolIdHex) => {
      try {
        const id = hexId ?? selectedStakePool?.hexId;
        // eslint-disable-next-line unicorn/no-null
        const pools = id ? { pools: [{ weight: 1, id }] } : null;

        setIsBuildingTx(true);
        const txBuilder = inMemoryWallet.createTxBuilder();
        const tx = await txBuilder.delegatePortfolio(pools).build().inspect();
        setDelegationTxBuilder(txBuilder);
        setDelegationTxFee(tx.body.fee.toString());
        setStakingError();
      } catch (error) {
        // TODO: check for error instance after LW-6749
        if (typeof error === 'object' && Object.values(InputSelectionFailure).includes(error.failure)) {
          setStakingError(ERROR_MESSAGES[error?.failure]);
        }
      } finally {
        setIsBuildingTx(false);
      }
    },
    [
      inMemoryWallet,
      selectedStakePool?.hexId,
      setDelegationTxBuilder,
      setDelegationTxFee,
      setIsBuildingTx,
      setStakingError
    ]
  );

  return { buildDelegation };
};
