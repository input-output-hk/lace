import React, { Fragment } from 'react';
import { MidnightLaunchBaseBanner } from '@lace/core';
import { Box, Dialog, sx } from '@input-output-hk/lace-ui-toolkit';
import { MIDNIGHT_LAUNCH_BANNER_KEY } from '@lib/scripts/types';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers';
import { useBannerDismissState } from './useBannerDismissState';

export const MidnightLaunchBanner = (): JSX.Element => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();

  const { isVisible, isDialogOpen, handleDialog, hideBanner, featureFlagPayload } = useBannerDismissState(
    MIDNIGHT_LAUNCH_BANNER_KEY,
    'midnight-launch'
  );

  if (!isVisible) {
    return <Fragment />;
  }

  return (
    <>
      <Dialog.Root open={isDialogOpen} setOpen={handleDialog} zIndex={999}>
        <Dialog.Title>{t('midnightLaunchBanner.dialog.title')}</Dialog.Title>
        <Dialog.Description>{t('midnightLaunchBanner.dialog.description')}</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Action
            cancel
            label={t('midnightLaunchBanner.dialog.cancel')}
            onClick={(): void => {
              handleDialog(false);
            }}
          />
          <Dialog.Action
            label={t('midnightLaunchBanner.dialog.confirm')}
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
        <MidnightLaunchBaseBanner
          translations={{
            title: t('midnightLaunchBanner.title'),
            description: t('midnightLaunchBanner.description'),
            ctaButton: t('midnightLaunchBanner.ctaButton')
          }}
          onCtaButtonClick={() => featureFlagPayload && openExternalLink(featureFlagPayload?.learnMoreUrl)}
          onClose={() => handleDialog(true)}
        />
      </Box>
    </>
  );
};
