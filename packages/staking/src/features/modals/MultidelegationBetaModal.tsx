import { Box, Flex } from '@lace/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BetaPill } from './BetaPill';
import { StakingModal } from './StakingModal';

interface MultidelegationBetaModalProps {
  visible: boolean;
  onConfirm: () => void;
  popupView?: boolean;
}

const CONFIRMATION_DELAY_IN_MS = 2000;

export const MultidelegationBetaModal = ({
  visible,
  onConfirm,
  popupView,
}: MultidelegationBetaModalProps): React.ReactElement => {
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
      visible={visible}
      title={
        <>
          {popupView && (
            <Flex alignItems="flex-start" mb="$8">
              <BetaPill />
            </Flex>
          )}
          <Flex alignItems="center">
            {t('modals.beta.title')}
            {!popupView && (
              <Box ml="$8">
                <BetaPill />
              </Box>
            )}
          </Flex>
        </>
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
