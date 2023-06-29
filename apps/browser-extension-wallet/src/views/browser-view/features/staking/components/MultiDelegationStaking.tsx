import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React from 'react';
import { useBackgroundServiceAPIContext, useExternalLinkOpener, useTheme } from '@providers';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { useDelegationDetails } from '@hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  const { setWalletPassword } = useBackgroundServiceAPIContext();
  const delegationDetails = useDelegationDetails();
  const selectedStakePoolDetails = useDelegationStore(stakePoolDetailsSelector);
  const { setDelegationTxBuilder, setSelectedStakePool } = useDelegationStore();
  const openExternalLink = useExternalLinkOpener();
  const { password, removePassword } = usePassword();
  const { setIsRestaking } = useSubmitingState();
  const {
    getKeyAgentType,
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  return (
    <OutsideHandlesProvider
      {...{
        backgroundServiceAPIContextSetWalletPassword: setWalletPassword,
        delegationDetails,
        delegationStoreSelectedStakePoolDetails: selectedStakePoolDetails,
        delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
        delegationStoreSetSelectedStakePool: setSelectedStakePool,
        openExternalLink,
        password,
        passwordRemovePassword: removePassword,
        submittingStateSetIsRestaking: setIsRestaking,
        walletStoreGetKeyAgentType: getKeyAgentType,
        walletStoreInMemoryWallet: inMemoryWallet,
        walletStoreWalletUICardanoCoin: cardanoCoin
      }}
    >
      <Staking theme={theme.name} />
    </OutsideHandlesProvider>
  );
};
