import { dappConnectorActions } from '@lace-contract/dapp-connector';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import {
  NavigationControls,
  StackRoutes,
  type SheetRoutes,
  type SheetScreenProps,
  TabRoutes,
} from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useLaceSelector } from '../../hooks';

import type { AuthorizedDapp } from '@lace-contract/dapp-connector';
import type { BlockchainName } from '@lace-lib/util-store';

const flattenAuthorizedDapps = (
  byChain: Partial<Record<BlockchainName, AuthorizedDapp[]>>,
): AuthorizedDapp[] => {
  const out: AuthorizedDapp[] = [];
  for (const key of Object.keys(byChain) as BlockchainName[]) {
    const chunk = byChain[key];
    if (chunk?.length) out.push(...chunk);
  }
  return out;
};

export const useAuthorizedDAppsSheet = (
  _props: SheetScreenProps<SheetRoutes.AuthorizedDApps>,
) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const authorizedByChain = useLaceSelector(
    'dappConnector.selectAuthorizedDapps',
  );
  const isDappExplorerAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.DAPP_EXPLORER,
  );

  const authorizedList = useMemo(
    () => flattenAuthorizedDapps(authorizedByChain),
    [authorizedByChain],
  );

  const handleRemove = useCallback(
    (entry: AuthorizedDapp) => {
      dispatch(
        dappConnectorActions.authorizedDapps.removeAuthorizedDapp({
          blockchainName: entry.blockchain,
          dapp: { id: entry.dapp.id },
        }),
      );
    },
    [dispatch],
  );

  const handleCloseSheet = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const handleBrowseDApps = useCallback(() => {
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.DApps,
    });
  }, []);

  const title = t('settings.wallet.authorized-dapps.title' as const);
  const subtitle = t('settings.wallet.authorized-dapps.description' as const);
  const browseButtonLabel = t(
    'settings.wallet.authorized-dapps.browse-button-label' as const,
  );
  const emptyMessage = t(
    'settings.wallet.authorized-dapps.empty-state-message' as const,
  );
  const closeButtonLabel = t(
    'settings.wallet.authorized-dapps.close-button-label' as const,
  );

  const dApps = useMemo(
    () =>
      authorizedList.map(entry => ({
        id: `${entry.blockchain}:${String(entry.dapp.id)}`,
        name: entry.dapp.name,
        category: entry.dapp.origin,
        icon: entry.dapp.imageUrl ?? '',
        blockchain: entry.blockchain,
        onDAppRemove: () => {
          handleRemove(entry);
        },
      })),
    [authorizedList, handleRemove],
  );

  return {
    title,
    subtitle,
    browseButtonLabel,
    closeButtonLabel,
    emptyMessage,
    dApps,
    isBrowseButtonVisible: isDappExplorerAvailable,
    onBrowseDApps: handleBrowseDApps,
    onClose: handleCloseSheet,
  };
};
