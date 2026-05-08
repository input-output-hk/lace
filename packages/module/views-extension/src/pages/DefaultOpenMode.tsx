import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  RadioGroup,
  Sheet,
  SheetFooter,
  SheetHeader,
  Text,
  spacing,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { windows } from 'webextension-polyfill';

import { useDefaultOpenMode } from '../default-open-mode';
import { useDispatchLaceAction } from '../hooks';

import { switchDefaultOpenMode } from './switch-default-open-mode';

import type { DefaultOpenMode } from '@lace-contract/views';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// Delay self-close long enough for the chrome.storage.local write triggered
// by the user's mode change to flush. Any shorter and `window.close()` can
// race the async write, leaving the preference unsaved.
//
// Implemented as a global setTimeout (not a useEffect) so it survives the
// sheet unmounting when NavigationControls.sheets.close() runs.
const FLUSH_WRITE_DELAY_MS = 100;

// Thin wrapper kept synchronous on purpose: chrome.sidePanel.open() rejects
// unless called inside the user gesture (no await/.then before it).
type ChromeSidePanelLike = {
  sidePanel?: { open?: (options: { windowId: number }) => Promise<void> };
};
const openSidePanelSync = (
  windowId: number,
  logger: Pick<Console, 'error'>,
): void => {
  const opened = (
    globalThis as { chrome?: ChromeSidePanelLike }
  ).chrome?.sidePanel?.open?.({ windowId });
  // .catch() is chained after the synchronous open() call, so the user
  // gesture is preserved. Without it, a rejection would surface as an
  // unhandled promise rejection while window.close() still fires below,
  // leaving the user with no visible Lace UI.
  opened?.catch((error: unknown) => {
    logger.error('Failed to open side panel', error);
  });
};

export const DefaultOpenModeSheet = (
  _props: SheetScreenProps<SheetRoutes.DefaultOpenMode>,
) => {
  const { t } = useTranslation();
  const [currentMode, setDefaultOpenMode] = useDefaultOpenMode();
  const openView = useDispatchLaceAction('views.openView');

  const [selectedMode, setSelectedMode] =
    useState<DefaultOpenMode>(currentMode);
  // Resolved once at mount and reused in the click handler so chrome.sidePanel
  // .open can be called synchronously within the user gesture.
  const [currentWindowId, setCurrentWindowId] = useState<number | undefined>();

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    let isAborted = false;
    void windows
      .getCurrent()
      .then(win => {
        if (!isAborted) setCurrentWindowId(win.id);
      })
      .catch(() => {
        // Leaving currentWindowId undefined disables sidePanel switching;
        // the helper logs and aborts on missing windowId.
      });
    return () => {
      isAborted = true;
    };
  }, []);

  const handleClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedMode === currentMode) {
      NavigationControls.sheets.close();
      return;
    }
    // Closes the sheet first so the view doesn't paint a frame after the
    // mode-switch fires.
    NavigationControls.sheets.close();
    const didSwitch = switchDefaultOpenMode(
      {
        openSidePanel: (windowId: number) => {
          openSidePanelSync(windowId, console);
        },
        openTab: () => {
          openView({ type: 'tab', location: '/' });
        },
        windowId: currentWindowId,
        persistMode: setDefaultOpenMode,
        logger: console,
      },
      selectedMode,
    );
    if (didSwitch) {
      setTimeout(() => {
        window.close();
      }, FLUSH_WRITE_DELAY_MS);
    }
  }, [
    selectedMode,
    currentMode,
    currentWindowId,
    setDefaultOpenMode,
    openView,
  ]);

  const options = useMemo(
    () => [
      {
        label: t(
          'v2.pages.settings.options.default-view-mode.options-side-panel',
        ),
        value: 'sidePanel',
      },
      {
        label: t('v2.pages.settings.options.default-view-mode.options-tab'),
        value: 'tab',
      },
    ],
    [t],
  );

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={t(
          'v2.pages.settings.options.default-view-mode.sheet-header-title',
        )}
        testID="default-view-mode-sheet-header"
      />
      <Sheet.Scroll
        contentContainerStyle={scrollContainerStyle}
        showsVerticalScrollIndicator={false}>
        <Column
          style={styles.container}
          alignItems="flex-start"
          gap={spacing.L}>
          <Text.M>
            {t('v2.pages.settings.options.default-view-mode.sheet-title')}
          </Text.M>
          <RadioGroup
            options={options}
            direction="column"
            value={selectedMode}
            onChange={(value: string) => {
              setSelectedMode(value as DefaultOpenMode);
            }}
          />
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: t('v2.pages.settings.options.default-view-mode.cancel-button'),
          onPress: handleClose,
          testID: 'default-view-mode-sheet-cancel-button',
        }}
        primaryButton={{
          label: t(
            'v2.pages.settings.options.default-view-mode.confirm-button',
          ),
          onPress: handleConfirm,
          testID: 'default-view-mode-sheet-confirm-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: spacing.M,
  },
});
