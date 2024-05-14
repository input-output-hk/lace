import React, { Fragment, useEffect, useState } from 'react';
import { MidnightEventBanner as View } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { Box, Dialog, sx } from '@lace/ui';
import { storage } from 'webextension-polyfill';
import { MIDNIGHT_EVENT_BANNER_KEY, MidnightEventBannerStorage } from '@lib/scripts/types';
import { useTranslation } from 'react-i18next';

interface State {
  isLoading: boolean;
  isDialogOpen: boolean;
  data: MidnightEventBannerStorage;
}

// eslint-disable-next-line no-magic-numbers
const REMINDER_TIME = 36 * 60 * 60 * 1000;

export const MidnightEventBanner = (): JSX.Element => {
  const { t } = useTranslation();
  const {
    walletUI: { appMode }
  } = useWalletStore();
  const popupView = appMode === APP_MODE_POPUP;
  const [state, setState] = useState<State>({
    isLoading: true,
    isDialogOpen: false,
    data: undefined
  });

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
        <View
          translations={{
            title: popupView ? t('midnightEventBanner.popup.title') : t('midnightEventBanner.desktop.title'),
            description: t('midnightEventBanner.description'),
            moreDetails: t('midnightEventBanner.moreDetails'),
            reminder: t('midnightEventBanner.reminder')
          }}
          onReminder={handleReminder}
          onClose={() => handleDialog(true)}
        />
      </Box>
    </>
  );
};
