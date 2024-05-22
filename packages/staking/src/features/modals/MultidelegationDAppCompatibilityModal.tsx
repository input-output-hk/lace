import { Flex } from '@lace/ui';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StakingModal } from './StakingModal';

const FAQ_URL =
  'https://www.lace.io/faq?question=why-do-some-dapps-behave-unexpectedly-when-they-start-using-multi-delegation';

interface MultidelegationBetaModalProps {
  visible: boolean;
  onConfirm: () => void;
  popupView?: boolean;
}

const CONFIRMATION_DELAY_IN_MS = 2000;

export const MultidelegationDAppCompatibilityModal = ({
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
        <Flex alignItems={popupView ? 'flex-start' : 'center'} flexDirection="row" gap="$8">
          {t('modals.dapp.title')}
        </Flex>
      }
      description={
        <Trans
          i18nKey="modals.dapp.description"
          t={t}
          components={{
            Link: <a href={FAQ_URL} rel="noreferrer noopener" target="_blank" />,
          }}
        />
      }
      actions={[
        {
          body: t('modals.dapp.button'),
          dataTestId: 'multidelegation-dapp-modal-button',
          disabled: confirmDisabled,
          onClick: onConfirm,
        },
      ]}
    />
  );
};
