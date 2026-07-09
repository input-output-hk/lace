import { useTranslation } from '@lace-contract/i18n';
import { useMemo } from 'react';

import { FEATURE_FLAG_WALLET_SECURITY_ALERTS } from '../const';
import { EXPLOIT_DESCRIPTORS } from '../security/exploit-descriptors';

import { useLaceSelector } from './lace-context';

import type { WalletSecurityAlertsFeatureFlagPayload } from '../const';
import type { FeatureFlag } from '@lace-contract/feature';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Shared per-account security-alert state used by the reusable chip and
 * disclosure components. Returns `null` when the account has no flagged
 * exploits or the WALLET_SECURITY_ALERTS feature flag is off, so callers can
 * simply short-circuit rendering.
 *
 * `chipLabel` is the localized name-suffix ("At risk") — the same string
 * that gets appended to account names elsewhere in the app. `bannerTitle`,
 * `bannerBody`, and `infoUrl` mirror what `SecurityAlertsBanner` renders on
 * the portfolio per-account view, so the inline disclosure can carry the same
 * detail wherever an account is presented.
 */
export type AccountSecurityAlert = {
  chipLabel: string;
  bannerTitle: string;
  bannerBody: string;
  infoUrl: string;
};

export const useAccountSecurityAlert = (
  accountId: AccountId,
): AccountSecurityAlert | null => {
  const { t } = useTranslation();

  const flaggedExploits = useLaceSelector(
    'cardanoContext.selectAccountFlaggedExploits',
    accountId,
  ) as readonly string[];
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures') as {
    featureFlags: readonly FeatureFlag[];
  };

  const securityAlertsFlag = useMemo(
    () =>
      featureFlags.find(
        ({ key }) => key === FEATURE_FLAG_WALLET_SECURITY_ALERTS,
      ),
    [featureFlags],
  );

  const securityAlertsPayload = useMemo<
    WalletSecurityAlertsFeatureFlagPayload | undefined
  >(() => {
    if (!securityAlertsFlag) return undefined;
    return 'payload' in securityAlertsFlag
      ? (securityAlertsFlag.payload as
          | WalletSecurityAlertsFeatureFlagPayload
          | undefined)
      : undefined;
  }, [securityAlertsFlag]);

  return useMemo<AccountSecurityAlert | null>(() => {
    if (!securityAlertsFlag) return null;
    for (const exploitId of flaggedExploits) {
      const descriptor = EXPLOIT_DESCRIPTORS[exploitId];
      if (!descriptor) continue;
      const override = securityAlertsPayload?.exploits?.[exploitId];
      if (override?.enabled === false) continue;
      return {
        chipLabel:
          override?.copy?.nameSuffix ??
          t(descriptor.copyKeys.nameSuffix as TranslationKey),
        bannerTitle:
          override?.copy?.banner ??
          t(descriptor.copyKeys.bannerTitle as TranslationKey),
        bannerBody: t(descriptor.copyKeys.bannerBody as TranslationKey),
        infoUrl: override?.infoUrl ?? descriptor.defaultInfoUrl,
      };
    }
    return null;
  }, [securityAlertsFlag, securityAlertsPayload, flaggedExploits, t]);
};
