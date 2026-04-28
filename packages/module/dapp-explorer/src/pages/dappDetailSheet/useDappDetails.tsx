import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { isWeb, openUrl } from '@lace-lib/ui-toolkit';
import { formatAmountRawToCompact } from '@lace-lib/util-render';
import { useCallback, useMemo } from 'react';

import { DAPP_DATA_RANGE_PERIOD } from '../../const';
import { useLaceSelector } from '../../hooks/lace-context';

export type DappDetailsTemplateProps = {
  header: {
    name: string;
    categories: string[];
    logoUrl?: string;
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
    descriptionHtml: string;
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
  testID?: string;
};

export const useDappDetails = (
  activeDapp: number,
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
      void openUrl({ url: selectedDapp.website, onError: () => {} });
    } else {
      NavigationControls.actions.closeAndNavigate(
        StackRoutes.DappExternalWebView,
        {
          title: selectedDapp.name,
          dapp: {
            icon: { img: { uri: selectedDapp.logo } },
            name: selectedDapp.name,
            category: selectedDapp.categories[0] ?? '',
          },
          buttonUrl: selectedDapp.website,
        },
      );
    }
  }, [selectedDapp, activeDapp]);

  if (!selectedDapp) return null;

  const statistics = shouldShowStatistics
    ? {
        title: t('v2.dapp-explorer.header.statistics'),
        subtitle: t('v2.dapp-explorer.header.last', {
          period: DAPP_DATA_RANGE_PERIOD,
        }),
        labels: {
          transactions: t('v2.dapp-explorer.header.transactions'),
          volume: t('v2.dapp-explorer.header.volume'),
          users: t('v2.dapp-explorer.header.users'),
        },
        values: {
          transactions: formatAmountRawToCompact({
            amount: selectedDapp.metrics.transactions?.toString() ?? '',
          }),
          volume: `$${formatAmountRawToCompact({
            amount: selectedDapp.metrics.volume?.toString() ?? '',
          })}`,
          users: formatAmountRawToCompact({
            amount: selectedDapp.metrics.uaw?.toString() ?? '',
          }),
        },
      }
    : undefined;

  return {
    testID: 'dapp-detail-sheet',
    header: {
      name: selectedDapp.name,
      categories: selectedDapp.categories,
      logoUrl: selectedDapp.logo,
    },
    statistics,
    details: {
      title: t('v2.dapp-explorer.header.details'),
      descriptionHtml: selectedDapp.fullDescription,
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
};
