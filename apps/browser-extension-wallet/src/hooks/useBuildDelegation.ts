import { useCallback } from 'react';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { StakingErrorType } from '@src/views/browser-view/features/staking/types';
import { useWalletStore } from '../stores';
import { useDelegationStore } from '../features/delegation/stores';
import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { Wallet } from '@lace/cardano';
import { DeRegistrationsWithRewardsLocked } from '@cardano-sdk/tx-construction';

const ERROR_MESSAGES = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingErrorType.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingErrorType.UTXO_BALANCE_INSUFFICIENT
} as const;

const isDeRegistrationsWithRewardsLockedError = (error: unknown): error is DeRegistrationsWithRewardsLocked =>
  !!error && typeof error === 'object' && 'name' in error && error.name === DeRegistrationsWithRewardsLocked.name;

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
        if (isDeRegistrationsWithRewardsLockedError(error)) {
          setStakingError({
            data: error.keysWithLockedRewards,
            type: StakingErrorType.REWARDS_LOCKED
          });
        } else if (
          // TODO: check for error instance after LW-6749
          typeof error === 'object' &&
          Object.values(InputSelectionFailure).includes(error.failure) &&
          error.failure in ERROR_MESSAGES
        ) {
          setStakingError({
            type: ERROR_MESSAGES[error.failure as keyof typeof ERROR_MESSAGES]
          });
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
