import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore, useStakingStore } from '../store';
import { StakingModal } from './StakingModal';

type StakingModalsProps = {
  popupView?: boolean;
};

export const ExitStakingModal = ({ popupView }: StakingModalsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const {
    delegationStoreSetDelegationTxBuilder,
    password: { clearSecrets: removePassword },
  } = useOutsideHandles();
  const { isExitStakingVisible, setExitStakingVisible } = useStakingStore();

  return (
    <StakingModal
      visible={isExitStakingVisible}
      title={t('modals.exitStaking.title')}
      description={t('modals.exitStaking.description')}
      actions={[
        {
          body: t('modals.exitStaking.buttons.cancel'),
          color: 'secondary',
          dataTestId: 'exit-staking-modal-cancel',
          onClick: () => {
            setExitStakingVisible(false);
          },
        },
        {
          body: t('modals.exitStaking.buttons.confirm'),
          dataTestId: 'exit-staking-modal-confirm',
          onClick: () => {
            delegationStoreSetDelegationTxBuilder();
            removePassword();
            portfolioMutators.executeCommand({ type: 'CancelDrawer' });
            setExitStakingVisible(false);
          },
        },
      ]}
      popupView={popupView}
      focusTriggerAfterClose={false}
    />
  );
};
