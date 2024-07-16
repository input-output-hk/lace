import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MAX_POOLS_COUNT } from '../store';
import { BetaPill } from './BetaPill';
import { StakingModal } from './StakingModal';

const BLOG_POST_URL =
  'https://www.lace.io/blog/stake-your-ada-across-multiple-pools-with-lace-s-new-multi-delegation-feature-beta';

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
        <Flex
          alignItems={popupView ? 'flex-start' : 'center'}
          flexDirection={popupView ? 'column-reverse' : 'row'}
          gap="$8"
        >
          {t('modals.beta.title')}
          <BetaPill />
        </Flex>
      }
      description={
        <Trans
          i18nKey="modals.beta.description"
          t={t}
          values={{ maxPools: MAX_POOLS_COUNT }}
          components={{
            Link: <a href={BLOG_POST_URL} rel="noreferrer noopener" target="_blank" />,
          }}
        />
      }
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
