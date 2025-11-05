import React, { useEffect, useState } from 'react';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { storage } from 'webextension-polyfill';
import { SWAPS_DISCLAIMER_ACKNOWLEDGED } from '@lib/scripts/types/storage';

export const DisclaimerModal = (): React.ReactElement => {
  const { t } = useTranslation();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const loadStorage = async () => {
      const data = await storage.local.get(SWAPS_DISCLAIMER_ACKNOWLEDGED);
      setShowDisclaimer(!data[SWAPS_DISCLAIMER_ACKNOWLEDGED] ?? true);
    };

    loadStorage();
  }, []);

  const handleAcknowledgeDisclaimer = async () => {
    await storage.local.set({
      [SWAPS_DISCLAIMER_ACKNOWLEDGED]: true
    });

    setShowDisclaimer(false);
  };

  const handleDialog = (isOpen: boolean) => {
    setShowDisclaimer(isOpen);
  };

  return (
    <Dialog.Root open={showDisclaimer} setOpen={handleDialog} zIndex={999}>
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
