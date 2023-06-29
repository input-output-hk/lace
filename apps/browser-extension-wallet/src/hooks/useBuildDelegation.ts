import { useEffect } from 'react';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { StakingError } from '@src/views/browser-view/features/staking/types';
import { useWalletStore } from '../stores';
import { useDelegationStore } from '../features/delegation/stores';
import { InputSelectionFailure } from '@cardano-sdk/input-selection';

const ERROR_MESSAGES: { [key: string]: StakingError } = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingError.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingError.UTXO_BALANCE_INSUFFICIENT
};

export const useBuildDelegation = (): void => {
  const { inMemoryWallet } = useWalletStore();
  const { selectedStakePool, setDelegationTxBuilder, setDelegationTxFee } = useDelegationStore();
  const { setIsBuildingTx, setStakingError } = useStakePoolDetails();

  useEffect(() => {
    const buildDelegation = async () => {
      try {
        setIsBuildingTx(true);
        const txBuilder = inMemoryWallet.createTxBuilder();
        const tx = await txBuilder
          .delegatePortfolio({ pools: [{ weight: 1, id: selectedStakePool.hexId }] })
          .build()
          .inspect();
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
    };

    buildDelegation();
  }, [
    inMemoryWallet,
    selectedStakePool.id,
    setDelegationTxBuilder,
    setDelegationTxFee,
    setIsBuildingTx,
    setStakingError
  ]);
};
