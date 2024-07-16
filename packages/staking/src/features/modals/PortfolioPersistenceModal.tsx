import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StakingModal } from './StakingModal';

interface PortfolioPersistenceModalProps {
  visible: boolean;
  onConfirm: () => void;
  popupView?: boolean;
}

const CONFIRMATION_DELAY_IN_MS = 4000;

export const PortfolioPersistenceModal = ({ popupView, visible, onConfirm }: PortfolioPersistenceModalProps) => {
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
      popupView={popupView}
      title={
        <Flex
          alignItems={popupView ? 'flex-start' : 'center'}
          flexDirection={popupView ? 'column-reverse' : 'row'}
          gap="$8"
        >
          {t('modals.beta.portfolioPersistence.title')}
        </Flex>
      }
      visible={visible}
      description={t('modals.beta.portfolioPersistence.description')}
      actions={[
        {
          body: t('modals.beta.button'),
          dataTestId: 'multidelegation-portfolio-persistence-modal-button',
          disabled: confirmDisabled,
          onClick: onConfirm,
        },
      ]}
    />
  );
};
