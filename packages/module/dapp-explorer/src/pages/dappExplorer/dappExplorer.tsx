import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import {
  DappExplorerPageTemplate,
  RiskWarningModal,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useLaceSelector } from '../../hooks/lace-context';

import { useDappExplorer } from './useDappExplorer';

import type { TabScreenProps } from '@lace-lib/navigation';

export const DappExplorer = ({}: TabScreenProps<TabRoutes.DApps>) => {
  const { t } = useTranslation();
  const isAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.DAPP_EXPLORER,
  );
  const { customUrlDisclaimer, ...templateProps } = useDappExplorer();

  useEffect(() => {
    if (!isAvailable) {
      NavigationControls.navigate(StackRoutes.Home, {
        screen: TabRoutes.Portfolio,
      });
    }
  }, [isAvailable]);

  if (!isAvailable) return null;

  return (
    <>
      <DappExplorerPageTemplate {...templateProps} />
      {customUrlDisclaimer.visible && (
        <RiskWarningModal
          title={t('v2.dapp-explorer.custom-url-warning.title')}
          body={t('v2.dapp-explorer.custom-url-warning.body', {
            url: customUrlDisclaimer.url ?? '',
          })}
          confirmLabel={t('v2.dapp-explorer.custom-url-warning.confirm')}
          onConfirm={customUrlDisclaimer.onConfirm}
          cancelLabel={t('v2.dapp-explorer.custom-url-warning.cancel')}
          onCancel={customUrlDisclaimer.onCancel}
          testIdPrefix="dapp-explorer-custom-url-warning"
        />
      )}
    </>
  );
};
