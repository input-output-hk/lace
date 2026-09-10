import { clearRestoreWalletSecrets } from '@lace-contract/account-management';
import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { isHardwareOption } from '@lace-contract/onboarding-v2';
import {
  NavigationControls,
  SheetRoutes,
  type StackScreenProps,
} from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';

import { isVaultCapabilityEnabled } from '../../capability-gating';
import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
  useLoadedOnboardingOptions,
} from '../../hooks';

import type { StackRoutes } from '@lace-lib/navigation';
import type { AddWalletPageTemplateProps } from '@lace-lib/ui-toolkit';

type AddWalletScreenProps = StackScreenProps<StackRoutes.AddWallet>;

export const useAddWalletPage = ({ navigation }: AddWalletScreenProps) => {
  const { t } = useTranslation();
  // Event names mirror onboarding's option presses (`onboarding | new wallet |
  // press`, …) under this surface's prefix, so the two funnels compare like
  // for like. The contributed migrate entry is deliberately not evented here:
  // its press dispatches wizardOpened, whose `migrate wallet | intro | view`
  // event already carries origin 'add-wallet' — an event here would count the
  // same press twice.
  const { trackEvent } = useAnalytics();
  const requestCreateWalletCeremony = useDispatchLaceAction(
    'vault.createWalletCeremonyRequested',
  );
  const requestImportWalletCeremony = useDispatchLaceAction(
    'vault.importWalletCeremonyRequested',
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreateWallet = useCallback(() => {
    trackEvent('account management | new wallet | press');
    requestCreateWalletCeremony({ origin: 'management' });
  }, [requestCreateWalletCeremony, trackEvent]);

  // Cleared here rather than in the ceremony side effect: the buffer is a
  // module singleton in this process, and on the extension side effects run in
  // the service worker, where the clear would miss it and leave the previous
  // import's phrase pre-filling the recovery sheet.
  const handleRestoreWallet = useCallback(() => {
    trackEvent('account management | restore wallet | press');
    clearRestoreWalletSecrets();
    requestImportWalletCeremony({ origin: 'management' });
  }, [requestImportWalletCeremony, trackEvent]);

  const handleConnectHardwareWallet = useCallback(() => {
    trackEvent('account management | hardware wallet | connect | press');
    NavigationControls.navigate(SheetRoutes.AddWalletHardware);
  }, [trackEvent]);

  // The same module-contributed entries onboarding offers (FR-1 requires the
  // migration flow from onboarding AND add wallet). Contributed through the
  // onboarding entry addon rather than a second contract: the options are the
  // same alternatives to creating or restoring, and a user who already has a
  // wallet reaches them here instead.
  const entryCustomisations = useUICustomisation(
    'addons.loadOnboardingEntryUICustomisations',
  );
  const entryOptions = useMemo(
    () =>
      entryCustomisations.flatMap(
        customisation => customisation.EntryOptions ?? [],
      ),
    [entryCustomisations],
  );

  const loadedOnboardingOptions = useLoadedOnboardingOptions();
  const vaultCapabilities = useLoadModules('addons.loadVaultCapabilities')?.[0];

  // Both halves are load-bearing: the options addon supplies the device tiles
  // the entry navigates to, and the capability says whether the active vault arm
  // can run a pairing ceremony at all.
  const hasHardwareOption = useMemo(
    () =>
      isVaultCapabilityEnabled(vaultCapabilities, 'connectHardware') &&
      (loadedOnboardingOptions?.flat().some(isHardwareOption) ?? false),
    [loadedOnboardingOptions, vaultCapabilities],
  );

  // On the shell host a ceremony only becomes visible once the host mounts its
  // surface — seconds on a cold service worker. Any pending launch locks the
  // whole tile set (the host mounts one surface at a time); only the pressed
  // tile spins.
  const pendingCeremony = useLaceSelector('vault.selectPendingCeremony');
  const isCeremonyPending = pendingCeremony !== null;

  const actions = useMemo<AddWalletPageTemplateProps['actions']>(
    () => [
      ...(vaultCapabilities?.create
        ? [
            {
              id: 'create-wallet',
              icon: 'Plus' as const,
              title: t('v2.account-details.add-wallet.create-wallet'),
              onPress: handleCreateWallet,
              disabled: isCeremonyPending,
              loading: pendingCeremony?.ceremony === 'create',
              testID: 'add-wallet-create-action',
            },
          ]
        : []),
      ...(vaultCapabilities?.import
        ? [
            {
              id: 'import-wallet',
              icon: 'Download' as const,
              title: t('v2.account-details.add-wallet.import-wallet'),
              onPress: handleRestoreWallet,
              disabled: isCeremonyPending,
              loading: pendingCeremony?.ceremony === 'import',
              testID: 'add-wallet-import-action',
            },
          ]
        : []),
      // Between import and hardware, matching the onboarding order: these are
      // alternatives to restoring, so they sit next to it.
      ...entryOptions.map(option => ({
        id: option.id,
        icon: option.icon as 'Plus',
        title: t(option.titleKey),
        onPress: () => {
          option.onPress('add-wallet');
        },
        // Leads away from this page, so it must not fire mid-ceremony.
        disabled: isCeremonyPending,
        testID: `add-wallet-${option.id}-action`,
      })),
      ...(hasHardwareOption
        ? [
            {
              id: 'connect-hardware',
              icon: 'HardwareWallet' as const,
              title: t('v2.account-details.add-wallet.hardware-wallet'),
              onPress: handleConnectHardwareWallet,
              // Navigates to the device picker rather than launching, so it
              // never spins — but must not lead away mid-launch.
              disabled: isCeremonyPending,
              testID: 'add-wallet-hardware-action',
            },
          ]
        : []),
    ],
    [
      handleCreateWallet,
      handleRestoreWallet,
      handleConnectHardwareWallet,
      hasHardwareOption,
      entryOptions,
      isCeremonyPending,
      pendingCeremony,
      vaultCapabilities,
      t,
    ],
  );

  return {
    title: t('v2.account-details.add-wallet.title'),
    actions,
    onBackPress: handleGoBack,
  } satisfies AddWalletPageTemplateProps;
};
