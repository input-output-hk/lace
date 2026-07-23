import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { isWeb, openUrl } from '@lace-lib/ui-toolkit';
import { useCallback, useMemo } from 'react';

import { useLaceSelector } from '../../hooks/lace-context';

import type { DappRating } from '@lace-lib/ui-toolkit';

export type DappDetailsTemplateProps = {
  header: {
    name: string;
    categories: string[];
    logoUrl?: string;
    rating?: DappRating | null;
  };
  statistics?: {
    title: string;
    subtitle?: string;
    labels: {
      transactions: string;
      volume: string;
      users: string;
    };
    values: {
      transactions: string;
      volume: string;
      users: string;
    };
  };
  details: {
    title: string;
    description: string;
  };
  socialLinks: {
    title: string;
    links: Array<{ type: string; url: string }>;
  };
  primaryButton: {
    label: string;
    onPress: () => void;
    testID?: string;
    preIconName?: 'Link';
  };
  secondaryButton?: {
    label: string;
    onPress: () => void;
    testID?: string;
  };
  warning?: string;
  testID?: string;
};

export const useDappDetails = (
  activeDapp: string,
): DappDetailsTemplateProps | null => {
  const { t } = useTranslation();
  const selectedDapp = useLaceSelector('dappExplorer.getDappById', activeDapp);
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');

  // todo: best practice write the feature payload to store? or use a sideeffect?
  const shouldShowStatistics = useMemo<boolean>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const dappExplorerFlag = featureFlags.find(
      (flag: FeatureFlag) => flag.key === FeatureFlagKey('DAPP_EXPLORER'),
    ) as FeatureFlag<{ showStatistics: boolean }> | undefined;

    return dappExplorerFlag?.payload?.showStatistics ?? false;
  }, [loadedFeatures]);

  const handleLaunchDapp = useCallback(() => {
    if (!selectedDapp) return;
    // Navigate to DappExternalWebView with the required DappConnectorSheetParams
    if (isWeb) {
      void openUrl({ url: selectedDapp.website ?? '', onError: () => {} });
    } else {
      NavigationControls.closeSheet();
      NavigationControls.navigate(StackRoutes.DappExternalWebView, {
        title: selectedDapp.name,
        dapp: {
          icon: { img: { uri: selectedDapp.logoUrl ?? undefined } },
          name: selectedDapp.name,
          category: selectedDapp.categories[0] ?? '',
        },
        buttonUrl: selectedDapp.website ?? '',
        // Curated dapps are launched read-only; favouriting is reserved for
        // user-entered external URLs.
        canFavorite: false,
      });
    }
  }, [selectedDapp]);

  return useMemo<DappDetailsTemplateProps | null>(() => {
    if (!selectedDapp) return null;

    const statistics = shouldShowStatistics
      ? {
          title: t('v2.dapp-explorer.header.statistics'),
          subtitle: t('v2.dapp-explorer.header.last', {
            period: '30d',
          }),
          labels: {
            transactions: t('v2.dapp-explorer.header.transactions'),
            volume: t('v2.dapp-explorer.header.volume'),
            users: t('v2.dapp-explorer.header.users'),
          },
          values: {
            transactions: '',
            volume: '',
            users: '',
          },
        }
      : undefined;

    const warning =
      selectedDapp.scam_status?.toLowerCase() === 'scam'
        ? t('v2.dapp-explorer.scam-warning')
        : undefined;

    return {
      testID: 'dapp-detail-sheet',
      warning,
      header: {
        name: selectedDapp.name,
        categories: selectedDapp.categories,
        logoUrl: selectedDapp.logoUrl ?? undefined,
        // TODO: re-implement ratings when tx-cart exists so multiple votes can be added to a single tx
        rating: null,
      },
      statistics,
      details: {
        title: t('v2.dapp-explorer.header.details'),
        description: selectedDapp.description ?? '',
      },
      socialLinks: {
        title: t('v2.dapp-explorer.header.contact'),
        links: selectedDapp.socialLinks,
      },
      primaryButton: {
        label: t('v2.generic.btn.launchDapp'),
        onPress: handleLaunchDapp,
        testID: 'dapp-detail-sheet-launch-dapp-button',
        preIconName: 'Link',
      },
    };
  }, [selectedDapp, shouldShowStatistics, handleLaunchDapp, t]);
};
