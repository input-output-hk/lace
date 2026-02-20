import React, { Fragment } from 'react';
import { MidnightEventBanner as MidnightEventBannerBase } from '@lace/core';
import { Box, Dialog, sx } from '@input-output-hk/lace-ui-toolkit';
import { MIDNIGHT_EVENT_BANNER_KEY, MidnightEventBannerStorage } from '@lib/scripts/types';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers';
import { useBannerDismissState } from './useBannerDismissState';

// eslint-disable-next-line no-magic-numbers
const REMINDER_TIME = Number.parseInt(process.env.MIDNIGHT_EVENT_BANNER_REMINDER_TIME);

const shouldHideByReminder = (data: MidnightEventBannerStorage): boolean =>
  data.lastSeen > 0 && data.lastSeen > Date.now() - REMINDER_TIME;

export const MidnightEventBanner = (): JSX.Element => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();

  const { isVisible, isDialogOpen, data, handleDialog, hideBanner, updateState, featureFlagPayload } =
    useBannerDismissState(MIDNIGHT_EVENT_BANNER_KEY, 'glacier-drop', shouldHideByReminder);

  if (!isVisible) {
    return <Fragment />;
  }

  const handleReminder = async () => {
    await updateState({ ...data, lastSeen: Date.now() });
  };

  return (
    <>
      <Dialog.Root open={isDialogOpen} setOpen={handleDialog} zIndex={999}>
        <Dialog.Title>{t('midnightEventBanner.dialog.title')}</Dialog.Title>
        <Dialog.Description>{t('midnightEventBanner.dialog.description')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            cancel
            label={t('midnightEventBanner.dialog.cancel')}
            onClick={(): void => {
              handleDialog(false);
            }}
          />
          <Dialog.Action
            label={t('midnightEventBanner.dialog.confirm')}
            onClick={(): void => {
              handleDialog(false);
              hideBanner();
            }}
          />
        </Dialog.Actions>
      </Dialog.Root>
      <Box
        className={sx({
          mb: {
            mediumScreen: '$20',
            popupScreen: '$16'
          }
        })}
      >
        <MidnightEventBannerBase
          translations={{
            title: t('midnightEventBanner.title'),
            description: t('midnightEventBanner.description'),
            learnMore: t('midnightEventBanner.learnMore'),
            reminder: t('midnightEventBanner.reminder')
          }}
          onReminder={handleReminder}
          onLearnMore={() => featureFlagPayload && openExternalLink(featureFlagPayload?.learnMoreUrl)}
          onClose={() => handleDialog(true)}
        />
      </Box>
    </>
  );
};
