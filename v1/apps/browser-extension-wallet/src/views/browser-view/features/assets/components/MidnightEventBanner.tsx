import React, { Fragment, useEffect, useState } from 'react';
import { MidnightEventBanner as MidnightEventBannerBase } from '@lace/core';
import { Box, Dialog, sx } from '@input-output-hk/lace-ui-toolkit';
import { storage } from 'webextension-polyfill';
import { MIDNIGHT_EVENT_BANNER_KEY, MidnightEventBannerStorage } from '@lib/scripts/types';
import { useTranslation } from 'react-i18next';
import { useExternalLinkOpener } from '@providers';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

interface State {
  isLoading: boolean;
  isDialogOpen: boolean;
  data: MidnightEventBannerStorage;
}

// eslint-disable-next-line no-magic-numbers
const REMINDER_TIME = Number.parseInt(process.env.MIDNIGHT_EVENT_BANNER_REMINDER_TIME);

export const MidnightEventBanner = (): JSX.Element => {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({
    isLoading: true,
    isDialogOpen: false,
    data: undefined
  });
  const openExternalLink = useExternalLinkOpener();
  const posthog = usePostHogClientContext();

  const isGlacierDropEnabled = posthog?.isFeatureFlagEnabled('glacier-drop');
  const glacierDropPayload = posthog.getFeatureFlagPayload('glacier-drop');

  useEffect(() => {
    const loadStorage = async () => {
      const data = await storage.local.get(MIDNIGHT_EVENT_BANNER_KEY);

      setState({
        isLoading: false,
        isDialogOpen: false,
        data: data[MIDNIGHT_EVENT_BANNER_KEY] ?? { lastSeen: 0, closed: false }
      });
    };

    loadStorage();
  }, []);

  const shouldHide = () => {
    if (!isGlacierDropEnabled) {
      return true;
    }

    if (state.isLoading) {
      return true;
    }

    if (state.data.closed) {
      return true;
    }

    if (state.data.lastSeen > 0 && state.data.lastSeen > Date.now() - REMINDER_TIME) {
      return true;
    }

    return false;
  };

  if (shouldHide()) {
    return <Fragment />;
  }

  const updateState = async (data: MidnightEventBannerStorage) => {
    await storage.local.set({
      [MIDNIGHT_EVENT_BANNER_KEY]: data
    });

    setState((s) => ({
      ...s,
      data
    }));
  };

  const handleReminder = async () => {
    const nexState = {
      ...state.data,
      lastSeen: Date.now()
    };

    await updateState(nexState);
  };

  const hideBanner = async () => {
    const nexState = {
      ...state.data,
      closed: true
    };

    await updateState(nexState);
  };

  const handleDialog = (isOpen: boolean) => {
    setState((s) => ({
      ...s,
      isDialogOpen: isOpen
    }));
  };

  return (
    <>
      <Dialog.Root open={state.isDialogOpen} setOpen={handleDialog} zIndex={999}>
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
          onLearnMore={() => glacierDropPayload && openExternalLink(glacierDropPayload?.learnMoreUrl)}
          onClose={() => handleDialog(true)}
        />
      </Box>
    </>
  );
};
