import React from 'react';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { useSwaps } from '../SwapProvider';

export const DisclaimerModal = (): React.ReactElement => {
  const { t } = useTranslation();
  const { disclaimerAcknowledged, handleAcknowledgeDisclaimer } = useSwaps();

  const handleDialog = () => {
    handleAcknowledgeDisclaimer();
  };

  return (
    <Dialog.Root
      open={typeof disclaimerAcknowledged === 'boolean' && !disclaimerAcknowledged}
      setOpen={handleDialog}
      zIndex={999}
    >
      <Dialog.Title>{t('swaps.disclaimer.heading')}</Dialog.Title>
      <Dialog.Description>{t('swaps.disclaimer.content.paragraph1')}</Dialog.Description>
      <Dialog.Description>{t('swaps.disclaimer.content.paragraph2')}</Dialog.Description>
      <Dialog.Description>{t('swaps.disclaimer.content.paragraph3')}</Dialog.Description>
      <Dialog.Actions>
        <Dialog.Action label={t('swaps.disclaimer.btn.acknowledge')} onClick={handleAcknowledgeDisclaimer} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
