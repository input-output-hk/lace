import { Flex } from '@lace/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BetaPill } from './BetaPill';
import { StakingModal } from './StakingModal';

interface MultidelegationBetaModalProps {
  visible: boolean;
  onConfirm: () => void;
}

const CONFIRMATION_DELAY_IN_MS = 2000;

export const MultidelegationBetaModal = ({ visible, onConfirm }: MultidelegationBetaModalProps): React.ReactElement => {
  const { t } = useTranslation();
  const [confirmDisabled, setConfirmDisabled] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setConfirmDisabled(false);
    }, CONFIRMATION_DELAY_IN_MS);
  }, []);

  return (
    <StakingModal
      announcement
      visible={visible}
      title={
        <Flex alignItems="center">
          {t('modals.beta.title')}
          <BetaPill />
        </Flex>
      }
      description={t('modals.beta.description')}
      actions={[
        {
          body: t('modals.beta.button'),
          dataTestId: 'multidelegation-beta-modal-button',
          disabled: confirmDisabled,
          onClick: onConfirm,
        },
      ]}
    />
  );
};
